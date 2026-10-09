import type { Metadata } from "next";
import { guard } from "@/components/shell/guard";
import { PageHeader } from "@/components/ui/primitives";
import { EntityList } from "@/components/entity/entity-list";

export const metadata: Metadata = { title: "Ereignisse" };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { denied } = await guard("ereignisse");
  if (denied) return denied;
  const { page } = await searchParams;
  return (
    <>
      <PageHeader title="Ereignisse" description="Besondere Vorkommnisse dokumentieren und die Nachverfolgung steuern." />
      <EntityList entityKey="incidents" page={Math.max(1, Number(page) || 1)} hideTitle />
    </>
  );
}
