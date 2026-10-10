import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BillingRow = {
  id: string; service: string; duration_min: number | null; created_at: string; unit_price_cents: number | null; amount_cents: number | null;
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
    .select("id, service, duration_min, created_at, unit_price_cents, amount_cents, visit:visits!inner(planned_start, status, patient_id, patient:patients(first_name, last_name, birth_date, pflegegrad))")
    .eq("organization_id", orgId)
    .gte("visits.planned_start", from)
    .lt("visits.planned_start", to)
    .order("created_at", { ascending: true })
    .limit(5000);
  return (data ?? []) as unknown as BillingRow[];
}

export type Coverage = { payer: string; insurance: string | null };

/** Coverage valid at any time within the month, newest first per patient. */
export async function loadCoverages(supabase: SupabaseClient, orgId: string, month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
  const { data } = await supabase
    .from("patient_coverages")
    .select("patient_id, insurance_number, valid_from, valid_to, payer:payers(name)")
    .eq("organization_id", orgId)
    .lte("valid_from", end)
    .or(`valid_to.is.null,valid_to.gte.${start}`)
    .order("valid_from", { ascending: false })
    .limit(5000);
  const out = new Map<string, Coverage>();
  for (const c of (data ?? []) as unknown as { patient_id: string; insurance_number: string | null; payer: { name: string } | null }[]) {
    if (!out.has(c.patient_id)) out.set(c.patient_id, { payer: c.payer?.name ?? "–", insurance: c.insurance_number });
  }
  return out;
}

export type PatientSummary = { id: string; name: string; pflegegrad: number | null; services: number; minutes: number; cents: number; payer: string; visits: Set<string> };

export function summarize(rows: BillingRow[], cov?: Map<string, Coverage>): PatientSummary[] {
  const by = new Map<string, PatientSummary>();
  for (const r of rows) {
    const p = r.visit.patient;
    const id = r.visit.patient_id;
    const e = by.get(id) ?? { id, name: p ? `${p.last_name}, ${p.first_name}` : "Unbekannt", pflegegrad: p?.pflegegrad ?? null, services: 0, minutes: 0, cents: 0, payer: cov?.get(id)?.payer ?? "Ohne Kostenträger", visits: new Set<string>() };
    e.services += 1; e.minutes += r.duration_min ?? 0; e.cents += r.amount_cents ?? 0; e.visits.add(r.visit.planned_start);
    by.set(id, e);
  }
  return [...by.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export function summarizeByPayer(summary: PatientSummary[]) {
  const by = new Map<string, { payer: string; patients: number; cents: number }>();
  for (const s of summary) {
    const e = by.get(s.payer) ?? { payer: s.payer, patients: 0, cents: 0 };
    e.patients += 1; e.cents += s.cents; by.set(s.payer, e);
  }
  return [...by.values()].sort((a, b) => a.payer.localeCompare(b.payer, "de"));
}

export const eurPlain = (cents: number | null) => (cents == null ? "" : (cents / 100).toFixed(2).replace(".", ","));

/** Neutralizes spreadsheet formula injection and escapes for a semicolon-separated CSV (German Excel). */
export function csvCell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
}
