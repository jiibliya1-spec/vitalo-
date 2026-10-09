import Link from "next/link";
import type { Metadata } from "next";
import { Users, ListChecks, AlarmClock, CalendarClock, FileText, TriangleAlert, HeartPulse, ClipboardList } from "lucide-react";
import { getContext } from "@/lib/context";
import { createClient } from "@/lib/supabase/server";
import { fmtDateTime } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const { orgId, roles, org } = await getContext();
  const supabase = await createClient();
  const clinical = roles.some((r) => ["pdl", "pflegefachkraft", "pflegehilfskraft", "auditor"].includes(r));
  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const week = new Date(now.getTime() - 7 * 864e5).toISOString();
  const in14 = new Date(now.getTime() + 14 * 864e5).toISOString().slice(0, 10);
  const count = (table: string, f: (q: any) => any) => // eslint-disable-line @typescript-eslint/no-explicit-any
    f(supabase.from(table).select("id", { count: "exact", head: true }).eq("organization_id", orgId)).then((r: { count: number | null }) => r.count ?? 0);

  const [patients, openTasks, overdue, visitsToday, drafts, openIncidents, flagged, reviews, recent] = await Promise.all([
    count("patients", (q) => q.eq("status", "aktiv")),
    count("tasks", (q) => q.eq("status", "offen")),
    count("tasks", (q) => q.eq("status", "offen").lt("due_at", now.toISOString())),
    count("visits", (q) => q.gte("planned_start", dayStart.toISOString()).lt("planned_start", dayEnd.toISOString())),
    clinical ? count("nursing_reports", (q) => q.eq("status", "draft")) : Promise.resolve(null),
    clinical ? count("incidents", (q) => q.neq("review_status", "abgeschlossen")) : Promise.resolve(null),
    clinical ? count("vital_signs", (q) => q.eq("flagged", true).gte("measured_at", week)) : Promise.resolve(null),
    clinical ? count("care_plans", (q) => q.eq("status", "aktiv").lte("review_date", in14)) : Promise.resolve(null),
    clinical
      ? supabase.from("nursing_reports").select("id, category, event_time, status, patients(last_name)").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(6).then((r) => r.data ?? [])
      : Promise.resolve([]),
  ]);

  const tiles = [
    { label: "Aktive Patienten", value: patients, icon: Users, href: "/patienten" },
    { label: "Offene Aufgaben", value: openTasks, icon: ListChecks, href: "/aufgaben" },
    { label: "Überfällige Aufgaben", value: overdue, icon: AlarmClock, href: "/aufgaben", warn: overdue > 0 },
    { label: "Besuche heute", value: visitsToday, icon: CalendarClock, href: "/besuche" },
    { label: "Berichte im Entwurf", value: drafts, icon: FileText, href: "/pflegeberichte", warn: (drafts ?? 0) > 0 },
    { label: "Offene Ereignisse", value: openIncidents, icon: TriangleAlert, href: "/ereignisse", warn: (openIncidents ?? 0) > 0 },
    { label: "Prüfhinweise Vitalwerte (7 Tage)", value: flagged, icon: HeartPulse, href: "/vitalwerte", warn: (flagged ?? 0) > 0 },
    { label: "Pflegepläne mit Überprüfung in 14 Tagen", value: reviews, icon: ClipboardList, href: "/pflegeplanung" },
  ].filter((t) => t.value !== null);

  return (
    <>
      <PageHeader title="Dashboard" description={`Überblick für ${org.name}. Alle Zahlen stammen aus der Datenbank.`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="rounded-xl border border-line bg-surface p-4 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between text-muted"><span className="text-sm">{t.label}</span><t.icon size={18} className={t.warn ? "text-warn" : "text-teal"} aria-hidden /></div>
            <div className={`mt-2 text-3xl font-semibold ${t.warn ? "text-warn" : "text-navy"}`}>{t.value}</div>
          </Link>
        ))}
      </div>
      {clinical && (
        <Card className="mt-6">
          <h2 className="border-b border-line px-4 py-3 font-semibold text-navy">Zuletzt erfasste Pflegeberichte</h2>
          {recent.length === 0 ? <EmptyState icon={<FileText size={30} />} title="Noch keine Berichte" /> : (
            <ul className="divide-y divide-line">
              {recent.map((r) => {
                const pt = r.patients as unknown as { last_name: string } | null;
                return (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <span>{pt?.last_name ?? "–"} · {fmtDateTime(r.event_time)}</span>
                    <span className="flex gap-2"><Badge value={r.category} /><Badge value={r.status} /></span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}
