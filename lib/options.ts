import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Field, Opt } from "@/lib/entities";
import { fmtDateTime } from "@/lib/format";

export type OptionSets = Partial<Record<Field["type"], Opt[]>>;

export async function loadMembers(supabase: SupabaseClient, orgId: string) {
  const { data: mem } = await supabase.from("organization_members").select("user_id, role").eq("organization_id", orgId);
  const ids = (mem ?? []).map((m) => m.user_id as string);
  const { data: profiles } = ids.length ? await supabase.from("user_profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, (p.full_name as string) || (p.email as string) || "Unbekannt"]));
  return (mem ?? []).map((m) => ({ id: m.user_id as string, role: m.role as string, name: byId.get(m.user_id as string) ?? "Unbekannt" }));
}

export async function loadOptions(supabase: SupabaseClient, orgId: string, fields: Field[], patientId?: string): Promise<OptionSets> {
  const types = new Set(fields.map((f) => f.type));
  const out: OptionSets = {};
  const jobs: PromiseLike<void>[] = [];
  if (types.has("patient"))
    jobs.push(supabase.from("patients").select("id, first_name, last_name").eq("organization_id", orgId).neq("status", "entlassen").order("last_name").limit(500)
      .then(({ data }) => { out.patient = (data ?? []).map((p) => ({ value: p.id, label: `${p.last_name}, ${p.first_name}` })); }));
  if (types.has("member"))
    jobs.push(loadMembers(supabase, orgId).then((m) => { out.member = m.map((x) => ({ value: x.id, label: x.name })); }));
  if (types.has("location"))
    jobs.push(supabase.from("care_locations").select("id, name").eq("organization_id", orgId).eq("archived", false).order("name")
      .then(({ data }) => { out.location = (data ?? []).map((l) => ({ value: l.id, label: l.name })); }));
  if (types.has("medication")) {
    let q = supabase.from("medication_records").select("id, name, dosage, patient_id").eq("organization_id", orgId).eq("active", true).limit(500);
    if (patientId) q = q.eq("patient_id", patientId);
    jobs.push(q.then(({ data }) => { out.medication = (data ?? []).map((m) => ({ value: m.id, label: `${m.name} (${m.dosage})` })); }));
  }
  if (types.has("wound")) {
    let q = supabase.from("wounds").select("id, body_location, wound_type, patient_id").eq("organization_id", orgId).eq("status", "aktiv").limit(500);
    if (patientId) q = q.eq("patient_id", patientId);
    jobs.push(q.then(({ data }) => { out.wound = (data ?? []).map((w) => ({ value: w.id, label: `${w.wound_type} – ${w.body_location}` })); }));
  }
  if (types.has("visit"))
    jobs.push(supabase.from("visits").select("id, planned_start").eq("organization_id", orgId).order("planned_start", { ascending: false }).limit(200)
      .then(({ data }) => { out.visit = (data ?? []).map((v) => ({ value: v.id, label: fmtDateTime(v.planned_start) })); }));
  if (types.has("careplan"))
    jobs.push(supabase.from("care_plans").select("id, goal").eq("organization_id", orgId).eq("status", "aktiv").limit(300)
      .then(({ data }) => { out.careplan = (data ?? []).map((c) => ({ value: c.id, label: String(c.goal).slice(0, 80) })); }));
  if (types.has("sis"))
    jobs.push(supabase.from("sis_assessments").select("id, assessed_at").eq("organization_id", orgId).order("assessed_at", { ascending: false }).limit(300)
      .then(({ data }) => { out.sis = (data ?? []).map((s) => ({ value: s.id, label: `SIS vom ${fmtDateTime(s.assessed_at)}` })); }));
  await Promise.all(jobs);
  return out;
}
