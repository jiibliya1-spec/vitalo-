import type { Metadata } from "next";
import { guard } from "@/components/shell/guard";
import { PageHeader } from "@/components/ui/primitives";
import { EntityList } from "@/components/entity/entity-list";

export const metadata: Metadata = { title: "Touren & Besuche" };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { denied } = await guard("besuche");
  if (denied) return denied;
  const { page } = await searchParams;
  const p = Math.max(1, Number(page) || 1);
  return (
    <>
      <PageHeader title="Touren & Besuche" description="Besuchsplanung und Leistungsnachweise für den ambulanten Dienst. Routenplanung ist noch nicht verfügbar." />
      <div className="grid gap-6">
        <EntityList entityKey="visits" page={p} />
        <EntityList entityKey="service_records" />
      </div>
    </>
  );
}
