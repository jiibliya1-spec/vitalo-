import { FolderLock, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getContext } from "@/lib/context";
import { fmtDateTime } from "@/lib/format";
import { hasAnyRole } from "@/lib/permissions";
import { categoryLabel, DOCUMENT_CATEGORIES } from "@/lib/document-categories";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { DownloadButton, UploadForm } from "./documents-client";

export async function DocumentsPanel({ patientId, q, category }: { patientId?: string; q?: string; category?: string }) {
  const { orgId, roles } = await getContext();
  const supabase = await createClient();
  let query = supabase.from("documents").select("id, filename, category, size_bytes, created_at, patient_id, patients(first_name, last_name)").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100);
  if (patientId) query = query.eq("patient_id", patientId);
  if (category && DOCUMENT_CATEGORIES.some((c) => c.key === category)) query = query.eq("category", category);
  if (q) query = query.ilike("filename", `%${q.replace(/[%_,()]/g, " ").trim()}%`);
  const { data } = await query;
  const canUpload = hasAnyRole(roles, ["pdl", "pflegefachkraft"]);
  let patients: { value: string; label: string }[] = [];
  if (canUpload && !patientId) {
    const { data: pts } = await supabase.from("patients").select("id, first_name, last_name").eq("organization_id", orgId).order("last_name").limit(500);
    patients = (pts ?? []).map((x) => ({ value: x.id, label: `${x.last_name}, ${x.first_name}` }));
  }
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div><h2 className="font-semibold text-navy">Dokumente</h2><p className="text-xs text-muted">Privat gespeichert. Downloads über kurzlebige Links, jeder Zugriff wird protokolliert.</p></div>
      </div>
      {canUpload && <div className="border-b border-line bg-bg px-4 py-3"><UploadForm patientId={patientId} patients={patients} /></div>}
      <form method="get" className="flex flex-wrap items-end gap-3 border-b border-line px-4 py-3">
        <div className="min-w-[10rem] flex-1"><label htmlFor="doc-q" className="mb-1 block text-xs font-medium">Suche im Dateinamen</label>
          <input id="doc-q" name="q" defaultValue={q ?? ""} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm" /></div>
        <div><label htmlFor="doc-cat" className="mb-1 block text-xs font-medium">Kategorie</label>
          <select id="doc-cat" name="category" defaultValue={category ?? ""} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
            <option value="">Alle</option>{DOCUMENT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select></div>
        {patientId && <input type="hidden" name="tab" value="dokumente" />}
        <button className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-bg"><Search size={15} aria-hidden /> Filtern</button>
      </form>
      {!data?.length ? (
        <EmptyState icon={<FolderLock size={32} />} title="Keine Dokumente" text="PDF, JPEG oder PNG bis 10 MB." />
      ) : (
        <ul className="divide-y divide-line">
          {data.map((d) => {
            const pt = d.patients as unknown as { first_name: string; last_name: string } | null;
            return (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{d.filename}</div>
                  <div className="text-xs text-muted">{pt ? `${pt.last_name}, ${pt.first_name} · ` : ""}{fmtDateTime(d.created_at)} · {(d.size_bytes / 1024).toFixed(0)} KB</div>
                </div>
                <div className="flex items-center gap-3"><Badge value={categoryLabel(d.category)} tone="info" /><DownloadButton id={d.id} /></div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
