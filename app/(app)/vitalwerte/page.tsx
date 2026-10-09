import type { Metadata } from "next";
import { guard } from "@/components/shell/guard";
import { PageHeader } from "@/components/ui/primitives";
import { EntityList } from "@/components/entity/entity-list";

export const metadata: Metadata = { title: "Vitalwerte" };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { denied } = await guard("vitalwerte");
  if (denied) return denied;
  const { page } = await searchParams;
  return (
    <>
      <PageHeader title="Vitalwerte" description="Messwerte erfassen und nachverfolgen. Prüfhinweise beruhen auf Grenzwerten, die Ihre Fachleitung konfiguriert – sie sind keine Diagnose." />
      <EntityList entityKey="vital_signs" page={Math.max(1, Number(page) || 1)} hideTitle />
    </>
  );
}
