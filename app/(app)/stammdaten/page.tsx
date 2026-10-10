import type { Metadata } from "next";
import { guard } from "@/components/shell/guard";
import { PageHeader } from "@/components/ui/primitives";
import { EntityList } from "@/components/entity/entity-list";

export const metadata: Metadata = { title: "Leistungen & Kostenträger" };

export default async function Page() {
  const { denied } = await guard("stammdaten");
  if (denied) return denied;
  return (
    <>
      <PageHeader title="Leistungen & Kostenträger" description="Stammdaten für die Abrechnung: Kostenträger, Leistungskatalog mit Preisen und die Zuordnung der Patienten." />
      <div className="grid gap-6">
        <EntityList entityKey="service_catalog" />
        <EntityList entityKey="payers" />
        <EntityList entityKey="patient_coverages" />
      </div>
    </>
  );
}
