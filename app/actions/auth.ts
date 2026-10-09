"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./records";

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const email = z.string().trim().toLowerCase().email("Gültige E-Mail-Adresse erforderlich");
const password = z.string().min(10, "Mindestens 10 Zeichen").max(128);

export async function signIn(formData: FormData): Promise<ActionResult> {
  const parsed = z.object({ email, password: z.string().min(1, "Passwort erforderlich") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: "Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen bzw. E-Mail bestätigen." };
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ full_name: z.string().trim().min(2, "Name erforderlich").max(120), email, password })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.full_name }, emailRedirectTo: `${site()}/auth/callback` },
  });
  if (error) return { ok: false, message: "Registrierung nicht möglich. Bitte Eingaben prüfen." };
  if (data.session) redirect("/onboarding");
  return { ok: true, message: "Bitte bestätigen Sie Ihre E-Mail-Adresse über den zugesandten Link." };
}

export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const parsed = z.object({ email }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${site()}/auth/callback?next=/passwort-neu` });
  return { ok: true, message: "Falls ein Konto existiert, wurde eine E-Mail zum Zurücksetzen versendet." };
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const parsed = z.object({ password }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: "Passwort konnte nicht geändert werden. Link ggf. erneut anfordern." };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
