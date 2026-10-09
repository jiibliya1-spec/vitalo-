"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, inputCls } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { createLocation, saveThreshold, updateOrganization } from "@/app/actions/org";
import type { ActionResult } from "@/app/actions/records";

function useAct(fn: (fd: FormData) => Promise<ActionResult>, reset = false) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return {
    pending,
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData(form);
      start(async () => { const r = await fn(fd); toast(r.ok, r.message); if (r.ok) { if (reset) form.reset(); router.refresh(); } });
    },
  };
}

export function OrgForm({ name, type }: { name: string; type: string }) {
  const { pending, onSubmit } = useAct(updateOrganization);
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_16rem_auto] sm:items-end">
      <div><label htmlFor="org-name" className="mb-1 block text-sm font-medium">Name</label><input id="org-name" name="name" defaultValue={name} required className={inputCls} /></div>
      <div><label htmlFor="org-type" className="mb-1 block text-sm font-medium">Versorgungsform</label>
        <select id="org-type" name="org_type" defaultValue={type} className={inputCls}><option value="stationaer">Stationäre Pflege</option><option value="ambulant">Ambulant</option><option value="aki">Außerklinische Intensivpflege</option><option value="gemischt">Gemischt</option></select></div>
      <Button type="submit" loading={pending}>Speichern</Button>
    </form>
  );
}

export function LocationForm() {
  const { pending, onSubmit } = useAct(createLocation, true);
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_14rem_auto] sm:items-end">
      <div><label htmlFor="loc-name" className="mb-1 block text-sm font-medium">Name</label><input id="loc-name" name="name" required maxLength={120} className={inputCls} /></div>
      <div><label htmlFor="loc-kind" className="mb-1 block text-sm font-medium">Art</label>
        <select id="loc-kind" name="kind" className={inputCls}><option value="wohnbereich">Wohnbereich</option><option value="standort">Standort</option><option value="tour">Tour</option><option value="intensiv">Intensivbereich</option></select></div>
      <Button type="submit" loading={pending}>Standort anlegen</Button>
    </form>
  );
}

export function ThresholdForm({ kind, label, unit, min, max }: { kind: string; label: string; unit: string; min: number | null; max: number | null }) {
  const { pending, onSubmit } = useAct(saveThreshold);
  return (
    <form onSubmit={onSubmit} className="grid items-end gap-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
      <input type="hidden" name="kind" value={kind} />
      <div className="text-sm font-medium">{label}</div>
      <div><label htmlFor={`min-${kind}`} className="mb-1 block text-xs text-muted">Min ({unit})</label><input id={`min-${kind}`} name="min_value" type="number" step="any" defaultValue={min ?? ""} className={inputCls} /></div>
      <div><label htmlFor={`max-${kind}`} className="mb-1 block text-xs text-muted">Max ({unit})</label><input id={`max-${kind}`} name="max_value" type="number" step="any" defaultValue={max ?? ""} className={inputCls} /></div>
      <Button type="submit" variant="secondary" loading={pending}>Speichern</Button>
    </form>
  );
}
