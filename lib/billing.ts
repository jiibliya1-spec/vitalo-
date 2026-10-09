import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BillingRow = {
  id: string; service: string; duration_min: number | null; created_at: string;
  visit: { planned_start: string; status: string; patient_id: string; patient: { first_name: string; last_name: string; birth_date: string; pflegegrad: number | null } | null };
};

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}

/** UTC instant of local midnight (Europe/Berlin) on the first day of the month. */
function berlinMonthStart(y: number, m: number) {
  const guess = new Date(Date.UTC(y, m - 1, 1));
  const tz = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", timeZoneName: "shortOffset" }).formatToParts(new Date(Date.UTC(y, m - 1, 1, 12))).find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const hours = Number(/GMT([+-]\d+)/.exec(tz)?.[1] ?? 1);
  return new Date(guess.getTime() - hours * 3600_000);
}

export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return { from: berlinMonthStart(y, m).toISOString(), to: berlinMonthStart(ny, nm).toISOString() };
}

export async function loadBilling(supabase: SupabaseClient, orgId: string, month: string): Promise<BillingRow[]> {
  const { from, to } = monthRange(month);
  const { data } = await supabase
    .from("service_records")
    .select("id, service, duration_min, created_at, visit:visits!inner(planned_start, status, patient_id, patient:patients(first_name, last_name, birth_date, pflegegrad))")
    .eq("organization_id", orgId)
    .gte("visits.planned_start", from)
    .lt("visits.planned_start", to)
    .order("created_at", { ascending: true })
    .limit(5000);
  return (data ?? []) as unknown as BillingRow[];
}

export function summarize(rows: BillingRow[]) {
  const by = new Map<string, { name: string; pflegegrad: number | null; services: number; minutes: number; visits: Set<string> }>();
  for (const r of rows) {
    const p = r.visit.patient;
    const e = by.get(r.visit.patient_id) ?? { name: p ? `${p.last_name}, ${p.first_name}` : "Unbekannt", pflegegrad: p?.pflegegrad ?? null, services: 0, minutes: 0, visits: new Set<string>() };
    e.services += 1; e.minutes += r.duration_min ?? 0; e.visits.add(r.visit.planned_start);
    by.set(r.visit.patient_id, e);
  }
  return [...by.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Neutralizes spreadsheet formula injection and escapes for a semicolon-separated CSV (German Excel). */
export function csvCell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
}
