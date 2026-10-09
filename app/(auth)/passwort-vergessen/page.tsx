import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/ui/auth-form";
import { requestPasswordReset } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Passwort zurücksetzen" };

export default function Forgot() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-navy">Passwort zurücksetzen</h1>
      <p className="mb-5 text-sm text-muted">Wir senden Ihnen einen Link zum Festlegen eines neuen Passworts.</p>
      <AuthForm action={requestPasswordReset} submit="Link anfordern" fields={[{ name: "email", label: "E-Mail", type: "email", autoComplete: "email" }]} />
      <p className="mt-4 text-sm"><Link className="text-tealdark hover:underline" href="/login">Zurück zur Anmeldung</Link></p>
    </>
  );
}
