import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/ui/auth-form";
import { signUp } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Registrieren" };

export default function Register() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-navy">Konto erstellen</h1>
      <p className="mb-5 text-sm text-muted">Danach legen Sie Ihre Organisation an oder nehmen eine Einladung an.</p>
      <AuthForm
        action={signUp}
        submit="Registrieren"
        fields={[
          { name: "full_name", label: "Vollständiger Name", type: "text", autoComplete: "name" },
          { name: "email", label: "E-Mail", type: "email", autoComplete: "email" },
          { name: "password", label: "Passwort", type: "password", autoComplete: "new-password", hint: "Mindestens 10 Zeichen." },
        ]}
      />
      <p className="mt-4 text-sm">Bereits registriert? <Link className="text-tealdark hover:underline" href="/login">Anmelden</Link></p>
    </>
  );
}
