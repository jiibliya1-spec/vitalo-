import type { Metadata } from "next";
import { guard } from "@/components/shell/guard";
import { PageHeader } from "@/components/ui/primitives";
import { EntityList } from "@/components/entity/entity-list";

export const metadata: Metadata = { title: "Pflegeberichte" };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { denied } = await guard("pflegeberichte");
  if (denied) return denied;
  const { page } = await searchParams;
  return (
    <>
      <PageHeader title="Pflegeberichte" description="Tägliche Pflegedokumentation. Finalisierte Berichte bleiben unverändert; Korrekturen werden mit Autor und Zeitstempel ergänzt." />
      <EntityList entityKey="nursing_reports" page={Math.max(1, Number(page) || 1)} hideTitle />
    </>
  );
}
