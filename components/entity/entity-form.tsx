"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button, inputCls } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { createRecord, createCorrection, type ActionResult } from "@/app/actions/records";
import type { Field, Opt } from "@/lib/entities";
import { useRouter } from "next/navigation";

type Props = {
  entityKey: string;
  singular: string;
  fields: Field[];
  options: Partial<Record<Field["type"], Opt[]>>;
  fixed?: Record<string, string>;
  label?: string;
};

function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function FieldInput({ f, options, error, defaultValue }: { f: Field; options: Opt[]; error?: string; defaultValue?: string }) {
  const id = `f-${f.name}`;
  const common = { id, name: f.name, required: f.required, "aria-invalid": !!error, "aria-describedby": error ? id + "-err" : undefined, className: inputCls };
  let input: React.ReactNode;
  if (f.type === "textarea") input = <textarea {...common} rows={4} maxLength={f.max} defaultValue={defaultValue} />;
  else if (f.type === "number") input = <input {...common} type="number" inputMode="decimal" step={f.step ?? "any"} min={f.min} defaultValue={defaultValue} />;
  else if (f.type === "date") input = <input {...common} type="date" defaultValue={defaultValue} />;
  else if (f.type === "datetime") input = <input {...common} type="datetime-local" defaultValue={defaultValue ?? (f.now ? localNow() : "")} />;
  else if (f.type === "checkbox") input = <input id={id} name={f.name} type="checkbox" className="h-4 w-4 accent-teal" />;
  else if (f.type === "text") input = <input {...common} type="text" maxLength={f.max} defaultValue={defaultValue} />;
  else {
    const opts = f.type === "select" ? f.options ?? [] : options;
    input = (
      <select {...common} defaultValue={defaultValue ?? (f.required && opts.length === 1 ? opts[0].value : "")}>
        <option value="">{opts.length ? "Bitte wählen" : "Keine Einträge vorhanden"}</option>
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {f.label}{f.required && <span className="text-danger" aria-hidden> *</span>}
      </label>
      {input}
      {error && <p id={id + "-err"} className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

/** Converts datetime-local values to ISO strings using the browser's time zone. */
function normalise(form: HTMLFormElement, fields: Field[]) {
  const fd = new FormData(form);
  for (const f of fields) {
    if (f.type === "datetime") {
      const v = fd.get(f.name);
      if (typeof v === "string" && v) fd.set(f.name, new Date(v).toISOString());
    }
  }
  return fd;
}

export function EntityForm({ entityKey, singular, fields, options, fixed = {}, label }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const visible = fields.filter((f) => !(f.name in fixed));

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = normalise(e.currentTarget, fields);
    Object.entries(fixed).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      const res: ActionResult = await createRecord(entityKey, fd);
      if (res.ok) {
        toast(true, res.message);
        ref.current?.close();
        formRef.current?.reset();
        setErrors({});
        setFormError("");
        router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.message);
      }
    });
  }

  return (
    <>
      <Button onClick={() => { setErrors({}); setFormError(""); ref.current?.showModal(); }}>
        <Plus size={16} aria-hidden /> {label ?? `${singular} erfassen`}
      </Button>
      <dialog ref={ref} className="m-auto w-[min(40rem,calc(100vw-1.5rem))] rounded-xl border border-line bg-surface p-0 text-ink shadow-2xl" aria-labelledby={`dlg-${entityKey}`}>
        <form ref={formRef} onSubmit={submit} noValidate={false}>
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 id={`dlg-${entityKey}`} className="text-lg font-semibold text-navy">{singular} erfassen</h2>
            <button type="button" aria-label="Schließen" onClick={() => ref.current?.close()} className="rounded p-1 hover:bg-bg"><X size={18} /></button>
          </div>
          <div className="grid max-h-[65vh] gap-4 overflow-y-auto px-5 py-4 sm:grid-cols-2">
            {visible.map((f) => (
              <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                <FieldInput f={f} options={options[f.type] ?? []} error={errors[f.name]} />
              </div>
            ))}
          </div>
          {formError && <p role="alert" className="mx-5 mb-2 rounded-lg bg-dangersoft px-3 py-2 text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
            <Button type="button" variant="secondary" onClick={() => ref.current?.close()}>Abbrechen</Button>
            <Button type="submit" loading={pending}>Speichern</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function CorrectionButton({ table, recordId }: { table: string; recordId: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();
  const router = useRouter();
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await createCorrection(fd);
      if (res.ok) { toast(true, res.message); ref.current?.close(); router.refresh(); }
      else { setErrors(res.fieldErrors ?? {}); toast(false, res.message); }
    });
  }
  return (
    <>
      <button className="text-xs font-medium text-tealdark underline underline-offset-2" onClick={() => ref.current?.showModal()}>Korrektur</button>
      <dialog ref={ref} className="m-auto w-[min(34rem,calc(100vw-1.5rem))] rounded-xl border border-line bg-surface p-0 text-ink shadow-2xl">
        <form onSubmit={submit}>
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-lg font-semibold text-navy">Korrektur protokollieren</h2>
            <button type="button" aria-label="Schließen" onClick={() => ref.current?.close()} className="rounded p-1 hover:bg-bg"><X size={18} /></button>
          </div>
          <input type="hidden" name="table_name" value={table} />
          <input type="hidden" name="record_id" value={recordId} />
          <div className="grid gap-4 px-5 py-4">
            <p className="text-sm text-muted">Der Originaleintrag bleibt unverändert erhalten. Ihre Korrektur wird mit Autor und Zeitstempel ergänzt.</p>
            <FieldInput f={{ name: "reason", label: "Begründung", type: "text", required: true, max: 1000 }} options={[]} error={errors.reason} />
            <FieldInput f={{ name: "corrected_content", label: "Korrigierter Inhalt", type: "textarea", required: true, max: 8000 }} options={[]} error={errors.corrected_content} />
          </div>
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
            <Button type="button" variant="secondary" onClick={() => ref.current?.close()}>Abbrechen</Button>
            <Button type="submit" loading={pending}>Korrektur speichern</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
