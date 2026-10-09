import type { Metadata } from "next";
import { guard } from "@/components/shell/guard";
import { PageHeader } from "@/components/ui/primitives";
import { EntityList } from "@/components/entity/entity-list";

export const metadata: Metadata = { title: "Dienstplanung" };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { denied } = await guard("dienstplanung");
  if (denied) return denied;
  const { page } = await searchParams;
  const p = Math.max(1, Number(page) || 1);
  return (
    <>
      <PageHeader title="Dienstplanung" description="Schichten planen und Schichtübergaben dokumentieren." />
      <div className="grid gap-6">
        <EntityList entityKey="shifts" page={p} />
        <EntityList entityKey="handovers" />
      </div>
    </>
  );
}
