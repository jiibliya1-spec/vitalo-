import type { Metadata } from "next";
import { guard } from "@/components/shell/guard";
import { PageHeader } from "@/components/ui/primitives";
import { EntityList } from "@/components/entity/entity-list";

export const metadata: Metadata = { title: "Verordnungen" };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { denied } = await guard("verordnungen");
  if (denied) return denied;
  const { page } = await searchParams;
  const p = Math.max(1, Number(page) || 1);
  return (
    <>
      <PageHeader title="Verordnungen" description="Ärztliche Verordnungen je Patient mit Gültigkeit. Verordnungen, die in 14 Tagen oder früher ablaufen, werden markiert." />
      <EntityList entityKey="prescriptions" page={p} />
    </>
  );
}
