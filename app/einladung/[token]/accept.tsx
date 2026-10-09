"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/primitives";
import { acceptInvitation } from "@/app/actions/org";

export function AcceptButton({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <div className="grid gap-3">
      {err && <p role="alert" className="rounded-lg bg-dangersoft px-3 py-2 text-sm text-danger">{err}</p>}
      <Button loading={pending} onClick={() => start(async () => { const r = await acceptInvitation(token); if (r && !r.ok) setErr(r.message); })}>Einladung annehmen</Button>
    </div>
  );
}
