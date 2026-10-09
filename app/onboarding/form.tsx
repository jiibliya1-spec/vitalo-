"use client";

import { useState, useTransition } from "react";
import { Button, inputCls } from "@/components/ui/primitives";
import { createOrganization } from "@/app/actions/org";

export function OnboardingForm() {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <form
      className="grid gap-4 rounded-xl border border-line bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => { const r = await createOrganization(fd); if (r && !r.ok) setErr(r.message); });
      }}
    >
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">Name der Einrichtung</label>
        <input id="name" name="name" required minLength={2} maxLength={120} className={inputCls} />
      </div>
      <div>
        <label htmlFor="org_type" className="mb-1 block text-sm font-medium">Versorgungsform</label>
        <select id="org_type" name="org_type" className={inputCls} defaultValue="stationaer">
          <option value="stationaer">Stationäre Pflege</option>
          <option value="ambulant">Ambulanter Pflegedienst</option>
          <option value="aki">Außerklinische Intensivpflege</option>
          <option value="gemischt">Gemischt</option>
        </select>
      </div>
      {err && <p role="alert" className="rounded-lg bg-dangersoft px-3 py-2 text-sm text-danger">{err}</p>}
      <Button type="submit" loading={pending}>Organisation anlegen</Button>
    </form>
  );
}
