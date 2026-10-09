import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/context";
import { OnboardingForm } from "./form";
import { Wordmark } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Organisation anlegen" };

export default async function Onboarding() {
  if (!(await getUser())) redirect("/login");
  return (
    <div className="mx-auto max-w-md pt-10">
      <div className="mb-6"><Wordmark /></div>
      <h1 className="mb-1 text-xl font-semibold text-navy">Ihre Organisation anlegen</h1>
      <p className="mb-5 text-sm text-muted">Sie werden Organisationsinhaber. Weitere Mitarbeiter laden Sie danach ein. Haben Sie eine Einladung erhalten, öffnen Sie bitte den Einladungslink.</p>
      <OnboardingForm />
    </div>
  );
}
