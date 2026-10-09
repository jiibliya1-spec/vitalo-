import type { Metadata } from "next";
import { guard } from "@/components/shell/guard";
import { PageHeader } from "@/components/ui/primitives";
import { EntityList } from "@/components/entity/entity-list";

export const metadata: Metadata = { title: "Wunden" };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { denied } = await guard("wunden");
  if (denied) return denied;
  const { page } = await searchParams;
  const p = Math.max(1, Number(page) || 1);
  return (
    <>
      <PageHeader title="Wunden" description="Wunden anlegen und den Verlauf über Beurteilungen dokumentieren. Beurteilungen sind unveränderlich." />
      <div className="grid gap-6">
        <EntityList entityKey="wounds" page={p} />
        <EntityList entityKey="wound_assessments" />
      </div>
    </>
  );
}
