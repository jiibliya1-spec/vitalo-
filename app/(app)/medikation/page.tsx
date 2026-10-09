import type { Metadata } from "next";
import { guard } from "@/components/shell/guard";
import { PageHeader } from "@/components/ui/primitives";
import { EntityList } from "@/components/entity/entity-list";

export const metadata: Metadata = { title: "Medikation" };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { denied } = await guard("medikation");
  if (denied) return denied;
  const { page } = await searchParams;
  const p = Math.max(1, Number(page) || 1);
  return (
    <>
      <PageHeader title="Medikation" description="Verordnete Medikation und Dokumentation der Verabreichung. Vitalo gibt keine Dosierungsempfehlungen und leitet keine Verordnungen ab." />
      <div className="grid gap-6">
        <EntityList entityKey="medication_records" page={p} />
        <EntityList entityKey="medication_administrations" />
      </div>
    </>
  );
}
