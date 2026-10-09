"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getContext, getMemberships, getUser, ORG_COOKIE } from "@/lib/context";
import { createClient } from "@/lib/supabase/server";
import { INVITABLE_ROLES } from "@/lib/permissions";
import type { ActionResult } from "./records";

const MANAGERS = ["org_owner", "org_admin"];
const uuid = z.string().uuid();

export async function createOrganization(formData: FormData): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Nicht angemeldet." };
  const parsed = z
    .object({ name: z.string().trim().min(2, "Name erforderlich").max(120), org_type: z.enum(["stationaer", "ambulant", "aki", "gemischt"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_organization", { p_name: parsed.data.name, p_org_type: parsed.data.org_type });
  if (error || !data) return { ok: false, message: "Organisation konnte nicht angelegt werden." };
  (await cookies()).set(ORG_COOKIE, data as string, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/dashboard");
}

export async function switchOrganization(orgId: string) {
  const memberships = await getMemberships();
  if (!memberships.some((m) => m.organization_id === orgId)) return;
  (await cookies()).set(ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/dashboard");
}

export async function acceptInvitation(token: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error || !data) return { ok: false, message: "Einladung ungültig, abgelaufen oder für eine andere E-Mail-Adresse bestimmt." };
  (await cookies()).set(ORG_COOKIE, data as string, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/dashboard");
}

export async function inviteMember(formData: FormData): Promise<ActionResult> {
  const { orgId, role, user } = await getContext();
  if (!MANAGERS.includes(role)) return { ok: false, message: "Keine Berechtigung." };
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email("Gültige E-Mail erforderlich"), role: z.enum(INVITABLE_ROLES as [string, ...string[]]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("invitations").insert({ ...parsed.data, organization_id: orgId, invited_by: user.id });
  if (error) return { ok: false, message: error.code === "23505" ? "Für diese E-Mail liegt bereits eine offene Einladung vor." : "Einladung konnte nicht erstellt werden." };
  revalidatePath("/mitarbeiter");
  return { ok: true, message: "Einladung erstellt. Kopieren Sie den Einladungslink und senden Sie ihn der Person." };
}

export async function revokeInvitation(id: string): Promise<ActionResult> {
  const { orgId, role } = await getContext();
  if (!MANAGERS.includes(role) || !uuid.safeParse(id).success) return { ok: false, message: "Keine Berechtigung." };
  const supabase = await createClient();
  const { error } = await supabase.from("invitations").update({ status: "revoked" }).eq("id", id).eq("organization_id", orgId);
  if (error) return { ok: false, message: "Einladung konnte nicht widerrufen werden." };
  revalidatePath("/mitarbeiter");
  return { ok: true, message: "Einladung widerrufen." };
}

export async function changeMemberRole(memberId: string, newRole: string): Promise<ActionResult> {
  const { orgId, role } = await getContext();
  if (!MANAGERS.includes(role) || !uuid.safeParse(memberId).success || !INVITABLE_ROLES.includes(newRole as never))
    return { ok: false, message: "Keine Berechtigung." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("organization_members").update({ role: newRole }).eq("id", memberId).eq("organization_id", orgId).select("id");
  if (error || !data?.length) return { ok: false, message: "Rolle konnte nicht geändert werden (Inhaber und eigene Rolle sind geschützt)." };
  revalidatePath("/mitarbeiter");
  return { ok: true, message: "Rolle aktualisiert." };
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  const { orgId, role } = await getContext();
  if (!MANAGERS.includes(role) || !uuid.safeParse(memberId).success) return { ok: false, message: "Keine Berechtigung." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("organization_members").delete().eq("id", memberId).eq("organization_id", orgId).select("id");
  if (error || !data?.length) return { ok: false, message: "Mitglied konnte nicht entfernt werden (Inhaber und eigener Zugang sind geschützt)." };
  revalidatePath("/mitarbeiter");
  return { ok: true, message: "Mitglied entfernt. Der Zugriff endet sofort." };
}

export async function updateOrganization(formData: FormData): Promise<ActionResult> {
  const { orgId, role } = await getContext();
  if (!MANAGERS.includes(role)) return { ok: false, message: "Keine Berechtigung." };
  const parsed = z
    .object({ name: z.string().trim().min(2, "Name erforderlich").max(120), org_type: z.enum(["stationaer", "ambulant", "aki", "gemischt"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("organizations").update(parsed.data).eq("id", orgId).select("id");
  if (error || !data?.length) return { ok: false, message: "Speichern nicht möglich." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Organisationsdaten gespeichert." };
}

export async function createLocation(formData: FormData): Promise<ActionResult> {
  const { orgId, role, user } = await getContext();
  if (!MANAGERS.includes(role)) return { ok: false, message: "Keine Berechtigung." };
  const parsed = z
    .object({ name: z.string().trim().min(1, "Name erforderlich").max(120), kind: z.enum(["wohnbereich", "standort", "tour", "intensiv"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("care_locations").insert({ ...parsed.data, organization_id: orgId, created_by: user.id });
  if (error) return { ok: false, message: "Standort konnte nicht angelegt werden." };
  revalidatePath("/einstellungen");
  return { ok: true, message: "Standort angelegt." };
}

export async function saveThreshold(formData: FormData): Promise<ActionResult> {
  const { orgId, role, user } = await getContext();
  if (!["org_owner", "org_admin", "pdl"].includes(role)) return { ok: false, message: "Keine Berechtigung." };
  const num = z.preprocess((v) => (v === "" || v === null ? null : Number(v)), z.number().nullable());
  const parsed = z
    .object({ kind: z.enum(["blutdruck", "puls", "temperatur", "spo2", "atemfrequenz", "gewicht", "blutzucker"]), min_value: num, max_value: num })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Ungültige Eingabe." };
  const { min_value, max_value } = parsed.data;
  if (min_value !== null && max_value !== null && min_value > max_value) return { ok: false, message: "Minimum darf nicht größer als Maximum sein." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("vital_thresholds")
    .upsert({ ...parsed.data, organization_id: orgId, created_by: user.id }, { onConflict: "organization_id,kind" });
  if (error) return { ok: false, message: "Grenzwert konnte nicht gespeichert werden." };
  revalidatePath("/einstellungen");
  return { ok: true, message: "Prüfgrenze gespeichert. Gilt für neue Messwerte." };
}
