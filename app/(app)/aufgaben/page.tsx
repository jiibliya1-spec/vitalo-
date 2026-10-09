import type { Metadata } from "next";
import { guard } from "@/components/shell/guard";
import { PageHeader } from "@/components/ui/primitives";
import { EntityList } from "@/components/entity/entity-list";

export const metadata: Metadata = { title: "Aufgaben" };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { denied } = await guard("aufgaben");
  if (denied) return denied;
  const { page } = await searchParams;
  return (
    <>
      <PageHeader title="Aufgaben" description="Zugewiesene Aufgaben mit Fälligkeit und Status. Überfällige Aufgaben sind markiert." />
      <EntityList entityKey="tasks" page={Math.max(1, Number(page) || 1)} hideTitle />
    </>
  );
}
