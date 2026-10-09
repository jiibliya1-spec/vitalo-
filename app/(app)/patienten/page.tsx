import type { Metadata } from "next";
import { Search } from "lucide-react";
import { guard } from "@/components/shell/guard";
import { PageHeader, Button, inputCls } from "@/components/ui/primitives";
import { EntityList } from "@/components/entity/entity-list";

export const metadata: Metadata = { title: "Patienten" };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const { denied } = await guard("patienten");
  if (denied) return denied;
  const { page, q } = await searchParams;
  return (
    <>
      <PageHeader title="Patienten" description="Stammdaten Ihrer Bewohner und Klienten." />
      <form role="search" className="mb-4 flex max-w-md gap-2">
        <label htmlFor="q" className="sr-only">Patient suchen</label>
        <input id="q" name="q" defaultValue={q} placeholder="Nach Name suchen" className={inputCls} />
        <Button type="submit" variant="secondary"><Search size={16} aria-hidden /> Suchen</Button>
      </form>
      <EntityList entityKey="patients" page={Math.max(1, Number(page) || 1)} q={q} hideTitle />
    </>
  );
}
