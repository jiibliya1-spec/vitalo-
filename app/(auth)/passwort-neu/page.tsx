import type { Metadata } from "next";
import { AuthForm } from "@/components/ui/auth-form";
import { updatePassword } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Neues Passwort" };

export default function NewPassword() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-navy">Neues Passwort festlegen</h1>
      <p className="mb-5 text-sm text-muted">Sie sind über den E-Mail-Link angemeldet.</p>
      <AuthForm action={updatePassword} submit="Passwort speichern" fields={[{ name: "password", label: "Neues Passwort", type: "password", autoComplete: "new-password", hint: "Mindestens 10 Zeichen." }]} />
    </>
  );
}
