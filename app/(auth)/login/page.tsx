import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/ui/auth-form";
import { signIn } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Anmelden" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; fehler?: string }> }) {
  const { next, fehler } = await searchParams;
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-navy">Anmelden</h1>
      <p className="mb-5 text-sm text-muted">Melden Sie sich mit Ihrem Vitalo-Konto an.</p>
      {fehler && <p role="alert" className="mb-4 rounded-lg bg-dangersoft px-3 py-2 text-sm text-danger">Der Link ist ungültig oder abgelaufen. Bitte erneut anmelden.</p>}
      <AuthForm
        action={signIn}
        submit="Anmelden"
        hidden={{ next: next ?? "" }}
        fields={[{ name: "email", label: "E-Mail", type: "email", autoComplete: "email" }, { name: "password", label: "Passwort", type: "password", autoComplete: "current-password" }]}
      />
      <div className="mt-4 flex justify-between text-sm">
        <Link className="text-tealdark hover:underline" href="/passwort-vergessen">Passwort vergessen?</Link>
        <Link className="text-tealdark hover:underline" href="/registrieren">Konto erstellen</Link>
      </div>
    </>
  );
}
