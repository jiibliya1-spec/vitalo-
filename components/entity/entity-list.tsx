import Link from "next/link";
import { FileText, ChevronLeft, ChevronRight, ShieldAlert, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getContext } from "@/lib/context";
import { ENTITIES, VITAL_UNITS, type Column } from "@/lib/entities";
import { loadMembers, loadOptions } from "@/lib/options";
import { fmtDate, fmtDateTime, fullName } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { CorrectionButton, EntityForm } from "./entity-form";
import { RowActions } from "./row-actions";

const PAGE = 25;
const nowMs = () => Date.now();
type Row = Record<string, unknown>;

export async function EntityList({
  entityKey, page = 1, q, patientId, hideTitle = false, extraFilter, extraFixed,
}: {
  entityKey: string; page?: number; q?: string; patientId?: string; hideTitle?: boolean;
  extraFilter?: { column: string; value: string }; extraFixed?: Record<string, string>;
}) {
  const entity = ENTITIES[entityKey];
  const { orgId, role } = await getContext();
  const supabase = await createClient();
  const canWrite = entity.writeRoles.includes(role);
  const hasPatient = entity.fields.some((f) => f.name === "patient_id");

  let query = supabase.from(entity.table).select("*", { count: "exact" }).eq("organization_id", orgId)
    .order(entity.order.column, { ascending: entity.order.ascending })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (patientId && hasPatient) query = query.eq("patient_id", patientId);
  if (patientId && entityKey === "patients") query = query.eq("id", patientId);
  if (extraFilter) query = query.eq(extraFilter.column, extraFilter.value);
  if (entityKey === "patients" && q) {
    const s = q.replace(/[^\p{L}\p{N} \-]/gu, "").trim();
    if (s) query = query.or(`last_name.ilike.%${s}%,first_name.ilike.%${s}%`);
  }
  const { data, count, error } = await query;
  const rows = (data ?? []) as Row[];

  const [options, members] = await Promise.all([
    canWrite ? loadOptions(supabase, orgId, entity.fields, patientId) : Promise.resolve({}),
    loadMembers(supabase, orgId),
  ]);
  const memberName = new Map(members.map((m) => [m.id, m.name]));

  const patientIds = [...new Set(rows.map((r) => r.patient_id as string).filter(Boolean))];
  const medIds = [...new Set(rows.map((r) => r.medication_id as string).filter(Boolean))];
  const ids = rows.map((r) => r.id as string);
  const [pat, med, cor] = await Promise.all([
    patientIds.length ? supabase.from("patients").select("id, first_name, last_name").in("id", patientIds) : Promise.resolve({ data: [] }),
    medIds.length ? supabase.from("medication_records").select("id, name, dosage").in("id", medIds) : Promise.resolve({ data: [] }),
    entity.correctable && ids.length
      ? supabase.from("record_corrections").select("id, record_id, reason, corrected_content, created_by, created_at").eq("table_name", entity.table).in("record_id", ids).order("created_at")
      : Promise.resolve({ data: [] }),
  ]);
  const patientName = new Map((pat.data ?? []).map((p) => [p.id as string, fullName(p as never)]));
  const medName = new Map((med.data ?? []).map((m) => [m.id as string, `${m.name} (${m.dosage})`]));
  const corrections = new Map<string, Row[]>();
  (cor.data ?? []).forEach((c) => corrections.set(c.record_id as string, [...(corrections.get(c.record_id as string) ?? []), c as Row]));

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const now = nowMs();

  function cell(col: Column, r: Row) {
    const v = r[col.key];
    if (col.key === "display") {
      const unit = VITAL_UNITS[String(r.kind)] ?? "";
      return r.kind === "blutdruck" ? `${r.value}/${r.value2} ${unit}` : `${r.value} ${unit}`;
    }
    if (col.key === "medication_id") return medName.get(v as string) ?? "–";
    switch (col.type) {
      case "datetime": return fmtDateTime(v as string);
      case "date": return fmtDate(v as string);
      case "badge": return v ? <Badge value={String(v)} /> : "–";
      case "patient": return v ? (
        <Link className="text-tealdark underline-offset-2 hover:underline" href={`/patienten/${v}`}>{patientName.get(v as string) ?? "–"}</Link>
      ) : "–";
      case "member": return memberName.get(v as string) ?? "–";
      case "bool":
        if (col.key === "flagged") return v ? <span className="inline-flex items-center gap-1 text-warn"><AlertTriangle size={14} />Prüfen</span> : <span className="text-muted">–</span>;
        return v ? "Ja" : "Nein";
      case "wrap": return <span className="line-clamp-3 max-w-md whitespace-pre-wrap">{String(v ?? "–")}</span>;
      default:
        if (entityKey === "patients" && col.key === "last_name") return <Link className="font-medium text-tealdark hover:underline" href={`/patienten/${r.id}`}>{`${r.last_name}, ${r.first_name}`}</Link>;
        return v === null || v === undefined || v === "" ? "–" : String(v);
    }
  }

  const fixed = { ...(patientId && hasPatient ? { patient_id: patientId } : {}), ...(extraFixed ?? {}) };
  const href = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        {hideTitle ? <span className="text-sm text-muted">{total} Einträge</span> : (
          <div><h2 className="font-semibold text-navy">{entity.title}</h2><p className="text-xs text-muted">{total} Einträge</p></div>
        )}
        {canWrite && (
          <EntityForm entityKey={entityKey} singular={entity.singular} fields={entity.fields} options={options} fixed={fixed} />
        )}
      </div>
      {error ? (
        <EmptyState icon={<ShieldAlert size={32} />} title="Zugriff nicht möglich" text="Sie haben keine Berechtigung für diese Daten oder es ist ein Fehler aufgetreten." />
      ) : rows.length === 0 ? (
        <EmptyState icon={<FileText size={32} />} title={q ? "Keine Treffer" : entity.empty} text={canWrite && !q ? "Über die Schaltfläche oben rechts legen Sie den ersten Eintrag an." : undefined} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg text-xs uppercase tracking-wide text-muted">
              <tr>
                {entity.columns.map((c) => <th key={c.key} scope="col" className="px-4 py-2.5 font-medium">{c.label}</th>)}
                <th scope="col" className="px-4 py-2.5 text-right font-medium"><span className="sr-only">Aktionen</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const acts = (entity.actions ?? []).map((a, index) => ({ a, index })).filter(({ a }) => a.when(r));
                const overdue = entityKey === "tasks" && r.status === "offen" && r.due_at && new Date(r.due_at as string).getTime() < now;
                const cors = corrections.get(r.id as string) ?? [];
                return (
                  <FragmentRow key={r.id as string} overdue={!!overdue} span={entity.columns.length + 1}
                    corrections={cors.map((c) => ({ id: c.id as string, reason: c.reason as string, text: c.corrected_content as string, by: memberName.get(c.created_by as string) ?? "–", at: fmtDateTime(c.created_at as string) }))}>
                    {entity.columns.map((c) => <td key={c.key} className="px-4 py-2.5 align-top">{cell(c, r)}{c.key === entity.columns[0].key && overdue ? <span className="ml-2"><Badge value="überfällig" tone="danger" /></span> : null}</td>)}
                    <td className="px-4 py-2.5 align-top">
                      <div className="flex flex-col items-end gap-1.5">
                        {canWrite && acts.length > 0 && (
                          <RowActions entityKey={entityKey} id={r.id as string} actions={acts.map(({ a, index }) => ({ index, label: a.label, icon: a.icon, confirm: a.confirm }))} />
                        )}
                        {entity.correctable && canWrite && ["pdl", "pflegefachkraft"].includes(role) && (r.status === "final" || r.review_status === "abgeschlossen" || ["vital_signs", "medication_administrations"].includes(entityKey)) && (
                          <CorrectionButton table={entity.table} recordId={r.id as string} />
                        )}
                      </div>
                    </td>
                  </FragmentRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav className="flex items-center justify-between border-t border-line px-4 py-3 text-sm" aria-label="Seitennavigation">
          <span className="text-muted">Seite {page} von {pages}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 hover:bg-bg" href={href(page - 1)}><ChevronLeft size={15} />Zurück</Link> : null}
            {page < pages ? <Link className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 hover:bg-bg" href={href(page + 1)}>Weiter<ChevronRight size={15} /></Link> : null}
          </div>
        </nav>
      )}
    </Card>
  );
}

function FragmentRow({ children, overdue, span, corrections }: {
  children: React.ReactNode; overdue: boolean; span: number;
  corrections: { id: string; reason: string; text: string; by: string; at: string }[];
}) {
  return (
    <>
      <tr className={`border-t border-line ${overdue ? "bg-dangersoft/40" : ""}`}>{children}</tr>
      {corrections.map((c) => (
        <tr key={c.id} className="bg-warnsoft/50 text-xs">
          <td colSpan={span} className="px-4 py-2">
            <span className="font-medium text-warn">Korrektur</span> von {c.by}, {c.at} – Grund: {c.reason}<br />
            <span className="whitespace-pre-wrap text-ink">{c.text}</span>
          </td>
        </tr>
      ))}
    </>
  );
}
