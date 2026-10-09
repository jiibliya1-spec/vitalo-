"use client";

import { useState, useTransition } from "react";
import { Button, inputCls } from "@/components/ui/primitives";
import type { ActionResult } from "@/app/actions/records";

export type AuthField = { name: string; label: string; type: string; autoComplete?: string; hint?: string };

export function AuthForm({ action, fields, submit, hidden }: {
  action: (fd: FormData) => Promise<ActionResult>; fields: AuthField[]; submit: string; hidden?: Record<string, string>;
}) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<ActionResult | null>(null);
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => { const r = await action(fd); if (r) setRes(r); });
      }}
    >
      {Object.entries(hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="mb-1 block text-sm font-medium">{f.label}</label>
          <input id={f.name} name={f.name} type={f.type} required autoComplete={f.autoComplete} className={inputCls} />
          {f.hint && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
        </div>
      ))}
      {res && <p role={res.ok ? "status" : "alert"} className={`rounded-lg px-3 py-2 text-sm ${res.ok ? "bg-oksoft text-ok" : "bg-dangersoft text-danger"}`}>{res.message}</p>}
      <Button type="submit" loading={pending}>{submit}</Button>
    </form>
  );
}
