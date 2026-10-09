import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { guard } from "@/components/shell/guard";
import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { EntityList } from "@/components/entity/entity-list";
import { Sparkline } from "@/components/entity/sparkline";
import { DocumentsPanel } from "@/components/entity/documents-panel";

export const metadata: Metadata = { title: "Patientenakte" };

const TABS = [
  { key: "uebersicht", label: "Übersicht" }, { key: "berichte", label: "Pflegeberichte" }, { key: "vitalwerte", label: "Vitalwerte" },
  { key: "medikation", label: "Medikation" }, { key: "wunden", label: "Wunden" }, { key: "planung", label: "Pflegeplanung" },
  { key: "ereignisse", label: "Ereignisse" }, { key: "aufgaben", label: "Aufgaben & Besuche" }, { key: "dokumente", label: "Dokumente" },
];
const CLINICAL = ["pdl", "pflegefachkraft", "pflegehilfskraft", "auditor"];

export default async function PatientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; q?: string; category?: string }> }) {
  const { denied, ctx } = await guard("patienten");
  if (denied) return denied;
  const { id } = await params;
  const { tab: rawTab, q, category } = await searchParams;
  const clinical = ctx.roles.some((r) => CLINICAL.includes(r));
  const tabs = TABS.filter((t) => t.key === "uebersicht" || t.key === "aufgaben" || clinical).filter((t) => t.key !== "dokumente" || ctx.roles.some((r) => ["pdl", "pflegefachkraft", "auditor"].includes(r)));
  const tab = tabs.find((t) => t.key === rawTab)?.key ?? "uebersicht";

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: p } = await supabase.from("patients").select("*, care_locations(name)").eq("id", id).eq("organization_id", ctx.orgId).maybeSingle();
  if (!p) notFound();

  let vitals: { kind: string; points: { t: number; v: number }[] }[] = [];
  if (tab === "vitalwerte") {
    const { data } = await supabase.from("vital_signs").select("kind, value, measured_at").eq("patient_id", id).eq("organization_id", ctx.orgId).order("measured_at").limit(500);
    const byKind = new Map<string, { t: number; v: number }[]>();
    (data ?? []).forEach((r) => byKind.set(r.kind, [...(byKind.get(r.kind) ?? []), { t: new Date(r.measured_at).getTime(), v: Number(r.value) }]));
    vitals = [...byKind.entries()].map(([kind, points]) => ({ kind, points }));
  }

  return (
    <>
      <Link href="/patienten" className="mb-3 inline-flex items-center gap-1 text-sm text-tealdark hover:underline"><ArrowLeft size={15} aria-hidden /> Alle Patienten</Link>
      <PageHeader title={`${p.last_name}, ${p.first_name}`} description={`Geboren ${fmtDate(p.birth_date)}${p.room ? ` · Zimmer ${p.room}` : ""}${p.pflegegrad ? ` · Pflegegrad ${p.pflegegrad}` : ""}${p.care_locations?.name ? ` · ${p.care_locations.name}` : ""}`} actions={<Badge value={p.status} />} />
      <div role="tablist" aria-label="Bereiche der Patientenakte" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <Link key={t.key} role="tab" aria-selected={t.key === tab} href={`?tab=${t.key}`}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${t.key === tab ? "border-teal text-tealdark" : "border-transparent text-muted hover:text-ink"}`}>{t.label}</Link>
        ))}
      </div>
      <div className="grid gap-6">
        {tab === "uebersicht" && (<>
          {clinical && <EntityList entityKey="allergies" patientId={id} hideTitle={false} />}
          {clinical && <EntityList entityKey="diagnoses" patientId={id} />}
          <EntityList entityKey="patient_contacts" patientId={id} />
        </>)}
        {tab === "berichte" && <EntityList entityKey="nursing_reports" patientId={id} />}
        {tab === "vitalwerte" && (<>
          <Card className="p-4">
            <h2 className="mb-3 font-semibold text-navy">Verlauf</h2>
            {vitals.length === 0 ? <EmptyState icon={<ShieldAlert size={28} />} title="Noch keine Messwerte" /> : (
              <div className="grid gap-4 sm:grid-cols-2">{vitals.map((v) => <Sparkline key={v.kind} label={v.kind} points={v.points} />)}</div>
            )}
          </Card>
          <EntityList entityKey="vital_signs" patientId={id} />
        </>)}
        {tab === "medikation" && (<><EntityList entityKey="medication_records" patientId={id} /><EntityList entityKey="medication_administrations" patientId={id} /></>)}
        {tab === "wunden" && (<><EntityList entityKey="wounds" patientId={id} /><EntityList entityKey="wound_assessments" /></>)}
        {tab === "planung" && (<><EntityList entityKey="sis_assessments" patientId={id} /><EntityList entityKey="care_plans" patientId={id} /></>)}
        {tab === "ereignisse" && <EntityList entityKey="incidents" patientId={id} />}
        {tab === "aufgaben" && (<><EntityList entityKey="tasks" patientId={id} /><EntityList entityKey="visits" patientId={id} /></>)}
        {tab === "dokumente" && <DocumentsPanel patientId={id} q={q} category={category} />}
      </div>
    </>
  );
}
