"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { Button, inputCls } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { getDocumentUrl, uploadDocument } from "@/app/actions/documents";
import { DOCUMENT_CATEGORIES } from "@/lib/document-categories";

export function DownloadButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Button variant="secondary" loading={pending} onClick={() => start(async () => {
      const r = await getDocumentUrl(id);
      if (r.ok && r.url) window.open(r.url, "_blank", "noopener,noreferrer");
      else toast(false, r.message);
    })}><Download size={15} aria-hidden /> Öffnen</Button>
  );
}

export function UploadForm({ patientId, patients }: { patientId?: string; patients: { value: string; label: string }[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <form ref={ref} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      if (patientId) fd.set("patient_id", patientId);
      start(async () => {
        const r = await uploadDocument(fd);
        toast(r.ok, r.message);
        if (r.ok) { ref.current?.reset(); router.refresh(); }
      });
    }}>
      {!patientId && (
        <div>
          <label htmlFor="up-patient" className="mb-1 block text-xs font-medium">Patient</label>
          <select id="up-patient" name="patient_id" required className={inputCls} defaultValue="">
            <option value="">Bitte wählen</option>
            {patients.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="up-cat" className="mb-1 block text-xs font-medium">Kategorie</label>
        <select id="up-cat" name="category" className={inputCls} defaultValue="sonstiges">
          {DOCUMENT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="up-file" className="mb-1 block text-xs font-medium">Datei (PDF, JPEG, PNG, max. 10 MB)</label>
        <input id="up-file" name="file" type="file" required accept="application/pdf,image/jpeg,image/png" className={inputCls} />
        <p className="mt-1 text-xs text-muted">Am Smartphone kann direkt ein Foto aufgenommen werden (Papier abfotografieren).</p>
      </div>
      <Button type="submit" loading={pending}><Upload size={15} aria-hidden /> Hochladen</Button>
    </form>
  );
}
