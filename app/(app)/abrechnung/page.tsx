import type { Metadata } from "next";
import { Download, Receipt } from "lucide-react";
import { guard } from "@/components/shell/guard";
import { createClient } from "@/lib/supabase/server";
import { currentMonth, loadBilling, MONTH_RE, summarize } from "@/lib/billing";
import { fmtDateTime } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Abrechnung" };

export default async function Page({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { denied, ctx } = await guard("abrechnung");
  if (denied) return denied;
  const sp = await searchParams;
  const month = sp.month && MONTH_RE.test(sp.month) ? sp.month : currentMonth();
  const supabase = await createClient();
  const rows = await loadBilling(supabase, ctx.orgId, month);
  const summary = summarize(rows);
  const totalMin = summary.reduce((a, s) => a + s.minutes, 0);
  return (
    <>
      <PageHeader
        title="Abrechnung"
        description="Leistungsnachweise je Monat und Patient, bereit für Kostenträger und Prüfung. Export als CSV für Excel und Abrechnungsprogramme."
        actions={<a href={`/abrechnung/export?month=${month}`} className="inline-flex items-center gap-2 rounded-lg bg-teal px-3.5 py-2 text-sm font-medium text-white hover:bg-tealdark"><Download size={16} aria-hidden /> CSV exportieren</a>}
      />
      <div className="grid gap-6">
        <Card className="p-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div><label htmlFor="bill-month" className="mb-1 block text-xs font-medium">Monat</label>
              <input id="bill-month" name="month" type="month" defaultValue={month} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm" /></div>
            <button className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-bg">Anzeigen</button>
            <div className="ml-auto text-sm text-muted">{rows.length} Leistungen · {summary.length} Patienten · {totalMin} Minuten gesamt</div>
          </form>
        </Card>
        <Card>
          <h2 className="border-b border-line px-4 py-3 font-semibold text-navy">Übersicht je Patient</h2>
          {!summary.length ? (
            <EmptyState icon={<Receipt size={32} />} title="Keine Leistungen in diesem Monat" text="Leistungen werden unter Touren & Besuche erfasst und erscheinen hier automatisch." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-2">Patient</th><th className="px-4 py-2">Pflegegrad</th><th className="px-4 py-2">Besuche</th><th className="px-4 py-2">Leistungen</th><th className="px-4 py-2">Minuten</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {summary.map((s) => (
                    <tr key={s.name}><td className="px-4 py-2 font-medium">{s.name}</td><td className="px-4 py-2">{s.pflegegrad ?? "–"}</td><td className="px-4 py-2">{s.visits.size}</td><td className="px-4 py-2">{s.services}</td><td className="px-4 py-2">{s.minutes}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        {!!rows.length && (
          <Card>
            <h2 className="border-b border-line px-4 py-3 font-semibold text-navy">Einzelnachweise</h2>
            <ul className="divide-y divide-line">
              {rows.slice(0, 200).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <div><div className="font-medium">{r.service}</div>
                    <div className="text-xs text-muted">{r.visit.patient ? `${r.visit.patient.last_name}, ${r.visit.patient.first_name}` : "Unbekannt"} · Besuch {fmtDateTime(r.visit.planned_start)}</div></div>
                  <div className="flex items-center gap-3"><span className="text-xs text-muted">{r.duration_min ? `${r.duration_min} Min.` : "–"}</span><Badge value={r.visit.status} /></div>
                </li>
              ))}
            </ul>
            {rows.length > 200 && <p className="px-4 py-3 text-xs text-muted">Es werden die ersten 200 Einträge angezeigt. Der CSV-Export enthält alle.</p>}
          </Card>
        )}
      </div>
    </>
  );
}
