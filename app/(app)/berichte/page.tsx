import type { Metadata } from "next";
import { guard } from "@/components/shell/guard";
import { createClient } from "@/lib/supabase/server";
import { currentMonth, loadBilling, monthRange, MONTH_RE, summarize } from "@/lib/billing";
import { Card, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Auswertungen" };

export default async function Page({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { denied, ctx } = await guard("berichte");
  if (denied) return denied;
  const sp = await searchParams;
  const month = sp.month && MONTH_RE.test(sp.month) ? sp.month : currentMonth();
  const { from, to } = monthRange(month);
  const supabase = await createClient();
  const org = ctx.orgId;
  const count = async (table: string, col: string, extra?: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    let q = supabase.from(table).select("id", { count: "exact", head: true }).eq("organization_id", org).gte(col, from).lt(col, to);
    if (extra) q = extra(q);
    const { count: c } = await q;
    return c ?? 0;
  };
  const [reports, incidents, given, refused, skipped, visits, docs] = await Promise.all([
    count("nursing_reports", "event_time"),
    count("incidents", "event_time"),
    count("medication_administrations", "administered_at", (q) => q.eq("status", "gegeben")),
    count("medication_administrations", "administered_at", (q) => q.eq("status", "verweigert")),
    count("medication_administrations", "administered_at", (q) => q.eq("status", "ausgelassen")),
    count("visits", "planned_start"),
    count("documents", "created_at"),
  ]);
  const { count: activeWounds } = await supabase.from("wounds").select("id", { count: "exact", head: true }).eq("organization_id", org).eq("status", "aktiv");
  const { count: btm } = await supabase.from("medication_records").select("id", { count: "exact", head: true }).eq("organization_id", org).eq("active", true).eq("med_type", "btm");
  const { count: patients } = await supabase.from("patients").select("id", { count: "exact", head: true }).eq("organization_id", org).eq("status", "aktiv");
  const rows = await loadBilling(supabase, org, month);
  const summary = summarize(rows);
  const minutes = summary.reduce((a, s) => a + s.minutes, 0);
  const stats: [string, number][] = [
    ["Aktive Patienten", patients ?? 0], ["Besuche im Monat", visits], ["Erbrachte Leistungen", rows.length], ["Leistungsminuten", minutes],
    ["Pflegeberichte", reports], ["Ereignisse", incidents], ["Medikation gegeben", given], ["Verweigert", refused],
    ["Ausgelassen", skipped], ["Aktive Wunden", activeWounds ?? 0], ["Aktive BtM-Verordnungen", btm ?? 0], ["Neue Dokumente", docs],
  ];
  return (
    <>
      <PageHeader title="Auswertungen" description="Kennzahlen je Monat für Leitung und Prüfung (MD, Heimaufsicht). Nur Zählwerte, keine Einzelfalldaten." />
      <div className="grid gap-6">
        <Card className="p-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div><label htmlFor="rep-month" className="mb-1 block text-xs font-medium">Monat</label>
              <input id="rep-month" name="month" type="month" defaultValue={month} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm" /></div>
            <button className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-bg">Anzeigen</button>
          </form>
        </Card>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(([label, value]) => (
            <Card key={label} className="p-4"><div className="text-2xl font-semibold text-navy">{value}</div><div className="mt-1 text-xs text-muted">{label}</div></Card>
          ))}
        </div>
      </div>
    </>
  );
}
