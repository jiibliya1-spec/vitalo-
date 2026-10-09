"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWriteContext } from "@/lib/context";
import { ENTITIES, VITAL_LIMITS, type Field } from "@/lib/entities";

export type ActionResult = { ok: boolean; message: string; fieldErrors?: Record<string, string> };

const uuid = z.string().uuid();

function fieldSchema(f: Field): z.ZodType {
  let s: z.ZodType;
  switch (f.type) {
    case "text":
    case "textarea": {
      let t = z.string().trim();
      if (f.max) t = t.max(f.max, `Maximal ${f.max} Zeichen`);
      if (f.required) t = t.min(1, "Pflichtfeld");
      s = t;
      break;
    }
    case "number": {
      let n = z.coerce.number({ message: "Zahl erforderlich" });
      if (f.min !== undefined) n = n.min(f.min);
      s = n;
      break;
    }
    case "date":
      s = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ungültiges Datum");
      break;
    case "datetime":
      s = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Ungültiger Zeitpunkt");
      break;
    case "select":
      s = z.enum((f.options ?? []).map((o) => o.value) as [string, ...string[]], { message: "Ungültige Auswahl" });
      break;
    case "checkbox":
      s = z.boolean();
      break;
    default:
      s = uuid; // patient, member, location, medication, wound, visit, careplan, sis
  }
  return s;
}

export async function createRecord(entityKey: string, formData: FormData): Promise<ActionResult> {
  const entity = ENTITIES[entityKey];
  if (!entity) return { ok: false, message: "Unbekannter Bereich." };
  const { supabase, orgId, role, user } = await requireWriteContext();
  if (!entity.writeRoles.includes(role)) return { ok: false, message: "Für diese Aktion fehlt Ihnen die Berechtigung." };

  const values: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const f of entity.fields) {
    const raw = formData.get(f.name);
    const str = typeof raw === "string" ? raw.trim() : "";
    if (f.type === "checkbox") {
      values[f.name] = str === "on";
      continue;
    }
    if (str === "") {
      if (f.required) errors[f.name] = "Pflichtfeld";
      else values[f.name] = null;
      continue;
    }
    const parsed = fieldSchema(f).safeParse(str);
    if (!parsed.success) errors[f.name] = parsed.error.issues[0]?.message ?? "Ungültig";
    else values[f.name] = f.type === "datetime" ? new Date(parsed.data as string).toISOString() : parsed.data;
  }

  if (entityKey === "vital_signs" && !errors.value) {
    const kind = String(values.kind);
    const [lo, hi] = VITAL_LIMITS[kind] ?? [0, Infinity];
    const check = (n: unknown) => typeof n === "number" && n >= lo && n <= hi;
    if (!check(values.value)) errors.value = `Unplausibler Wert (erlaubt: ${lo} bis ${hi})`;
    if (kind === "blutdruck" && !check(values.value2)) errors.value2 = "Diastolischer Wert erforderlich und plausibel";
    if (kind !== "blutdruck") values.value2 = null;
  }
  if (typeof values.planned_start === "string" && typeof values.planned_end === "string" && values.planned_end <= values.planned_start)
    errors.planned_end = "Ende muss nach dem Beginn liegen";
  if (typeof values.starts_at === "string" && typeof values.ends_at === "string" && values.ends_at <= values.starts_at)
    errors.ends_at = "Ende muss nach dem Beginn liegen";

  if (Object.keys(errors).length) return { ok: false, message: "Bitte Eingaben prüfen.", fieldErrors: errors };

  let row: Record<string, unknown> = { ...values, organization_id: orgId, created_by: user.id };
  if (entity.derive) row = entity.derive(row);
  if (entityKey === "patients" && row.pflegegrad) row.pflegegrad = Number(row.pflegegrad);

  const { error } = await supabase.from(entity.table).insert(row);
  if (error) return { ok: false, message: friendlyError(error.message, error.code) };
  revalidatePath("/", "layout");
  return { ok: true, message: `${entity.singular} wurde gespeichert.` };
}

export async function runRowAction(entityKey: string, id: string, actionIndex: number): Promise<ActionResult> {
  const entity = ENTITIES[entityKey];
  const action = entity?.actions?.[actionIndex];
  if (!entity || !action || !uuid.safeParse(id).success) return { ok: false, message: "Ungültige Aktion." };
  const { supabase, orgId, role } = await requireWriteContext();
  if (!entity.writeRoles.includes(role)) return { ok: false, message: "Für diese Aktion fehlt Ihnen die Berechtigung." };
  const patch = Object.fromEntries(Object.entries(action.patch).map(([k, v]) => [k, v === "$now" ? new Date().toISOString() : v]));
  const { data, error } = await supabase.from(entity.table).update(patch).eq("id", id).eq("organization_id", orgId).select("id");
  if (error) return { ok: false, message: friendlyError(error.message, error.code) };
  if (!data?.length) return { ok: false, message: "Eintrag nicht gefunden oder keine Berechtigung." };
  revalidatePath("/", "layout");
  return { ok: true, message: `${action.label}: erfolgreich.` };
}

const correctionSchema = z.object({
  table_name: z.enum(["nursing_reports", "sis_assessments", "vital_signs", "medication_administrations", "wound_assessments", "incidents"]),
  record_id: uuid,
  reason: z.string().trim().min(3, "Begründung erforderlich").max(1000),
  corrected_content: z.string().trim().min(1, "Korrekturtext erforderlich").max(8000),
});

export async function createCorrection(formData: FormData): Promise<ActionResult> {
  const { supabase, orgId, role, user } = await requireWriteContext();
  if (!["pdl", "pflegefachkraft"].includes(role)) return { ok: false, message: "Für Korrekturen fehlt Ihnen die Berechtigung." };
  const parsed = correctionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (fieldErrors[String(i.path[0])] = i.message));
    return { ok: false, message: "Bitte Eingaben prüfen.", fieldErrors };
  }
  // verify the referenced record belongs to the active organization
  const { data: rec } = await supabase.from(parsed.data.table_name).select("id").eq("id", parsed.data.record_id).eq("organization_id", orgId).maybeSingle();
  if (!rec) return { ok: false, message: "Ursprünglicher Eintrag nicht gefunden." };
  const { error } = await supabase.from("record_corrections").insert({ ...parsed.data, organization_id: orgId, created_by: user.id });
  if (error) return { ok: false, message: friendlyError(error.message, error.code) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Korrektur wurde protokolliert. Der Originaleintrag bleibt unverändert." };
}

function friendlyError(message: string, code?: string) {
  if (code === "42501" || /row-level security|immutable|cannot be deleted/i.test(message))
    return "Nicht erlaubt: Der Datensatz ist geschützt oder Ihnen fehlt die Berechtigung.";
  if (code === "23514") return "Ein Wert verletzt eine Prüfregel. Bitte Eingaben kontrollieren.";
  if (code === "23505") return "Dieser Eintrag existiert bereits.";
  if (code === "23503") return "Verknüpfter Datensatz nicht gefunden.";
  return "Der Vorgang konnte nicht gespeichert werden.";
}
