import type { Metadata } from "next";
import { guard } from "@/components/shell/guard";
import { PageHeader } from "@/components/ui/primitives";
import { EntityList } from "@/components/entity/entity-list";

export const metadata: Metadata = { title: "Pflegeplanung" };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { denied } = await guard("pflegeplanung");
  if (denied) return denied;
  const { page } = await searchParams;
  return (
    <>
      <PageHeader title="Pflegeplanung" description="SIS-orientierte Einschätzung, Pflegeziele und Maßnahmen. Die Struktur ersetzt keine fachliche oder rechtliche Prüfung Ihrer Dokumentationsstandards." />
      <div className="grid gap-6">
        <EntityList entityKey="sis_assessments" page={Math.max(1, Number(page) || 1)} />
        <EntityList entityKey="care_plans" />
        <EntityList entityKey="care_plan_interventions" />
      </div>
    </>
  );
}
