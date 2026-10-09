import type { Metadata } from "next";
import { guard } from "@/components/shell/guard";
import { PageHeader } from "@/components/ui/primitives";
import { DocumentsPanel } from "@/components/entity/documents-panel";

export const metadata: Metadata = { title: "Dokumente" };

export default async function Page() {
  const { denied } = await guard("dokumente");
  if (denied) return denied;
  return (
    <>
      <PageHeader title="Dokumente" description="Patientenbezogene Dateien in privatem Speicher. Es gibt keine öffentlichen Links." />
      <DocumentsPanel />
    </>
  );
}
