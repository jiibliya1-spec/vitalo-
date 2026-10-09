"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2, UserPlus } from "lucide-react";
import { Button, inputCls } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { changeMemberRole, inviteMember, removeMember, revokeInvitation, setOwnClinicalRole } from "@/app/actions/org";
import { INVITABLE_ROLES, ROLE_LABEL, roleLabels, SELF_ASSIGNABLE_ROLES, type Role } from "@/lib/permissions";

export function InviteForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <form ref={ref} className="grid gap-3 sm:grid-cols-[1fr_14rem_auto] sm:items-end" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      start(async () => { const r = await inviteMember(fd); toast(r.ok, r.message); if (r.ok) { ref.current?.reset(); router.refresh(); } });
    }}>
      <div><label htmlFor="inv-email" className="mb-1 block text-sm font-medium">E-Mail</label><input id="inv-email" name="email" type="email" required className={inputCls} /></div>
      <div><label htmlFor="inv-role" className="mb-1 block text-sm font-medium">Rolle</label>
        <select id="inv-role" name="role" className={inputCls} defaultValue="pflegefachkraft">{INVITABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div>
      <Button type="submit" loading={pending}><UserPlus size={16} aria-hidden /> Einladen</Button>
    </form>
  );
}

export function MemberRow({ id, name, roles, isSelf }: { id: string; name: string; roles: Role[]; isSelf: boolean }) {
  const role = roles.includes("org_owner") ? "org_owner" : roles[0];
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const locked = role === "org_owner" || isSelf;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <div><div className="font-medium">{name}{isSelf && <span className="ml-2 text-xs text-muted">(Sie)</span>}</div></div>
      <div className="flex items-center gap-2">
        {locked ? <span className="rounded-full bg-bg px-3 py-1 text-xs">{roleLabels(roles)}</span> : (
          <>
            <label className="sr-only" htmlFor={`role-${id}`}>Rolle von {name}</label>
            <select id={`role-${id}`} disabled={pending} defaultValue={role} className={`${inputCls} !w-auto`} onChange={(e) => start(async () => {
              const r = await changeMemberRole(id, e.target.value); toast(r.ok, r.message); router.refresh();
            })}>{INVITABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
            <Button variant="secondary" loading={pending} aria-label={`${name} entfernen`} onClick={() => {
              if (!window.confirm(`${name} wirklich aus der Organisation entfernen? Der Zugriff endet sofort.`)) return;
              start(async () => { const r = await removeMember(id); toast(r.ok, r.message); router.refresh(); });
            }}><Trash2 size={15} aria-hidden /></Button>
          </>
        )}
      </div>
    </li>
  );
}

export function InviteRow({ id, email, role, expires, tokenPath }: { id: string; email: string; role: string; expires: string; tokenPath: string }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const router = useRouter();
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <div><div className="font-medium">{email}</div><div className="text-xs text-muted">{ROLE_LABEL[role as Role]} · gültig bis {expires}</div></div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={async () => {
          try { await navigator.clipboard.writeText(window.location.origin + tokenPath); setCopied(true); toast(true, "Einladungslink kopiert."); setTimeout(() => setCopied(false), 2000); }
          catch { toast(false, "Kopieren nicht möglich."); }
        }}><Copy size={15} aria-hidden /> {copied ? "Kopiert" : "Link kopieren"}</Button>
        <Button variant="secondary" loading={pending} onClick={() => start(async () => { const r = await revokeInvitation(id); toast(r.ok, r.message); router.refresh(); })}>Widerrufen</Button>
      </div>
    </li>
  );
}

export function SelfRoles({ active }: { active: Role[] }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      {SELF_ASSIGNABLE_ROLES.map((r) => {
        const on = active.includes(r);
        return (
          <Button key={r} variant={on ? "primary" : "secondary"} loading={pending} aria-pressed={on} onClick={() => start(async () => {
            const res = await setOwnClinicalRole(r, !on); toast(res.ok, res.message); router.refresh();
          })}>{on ? `${ROLE_LABEL[r]}: aktiv` : `Als ${ROLE_LABEL[r]} arbeiten`}</Button>
        );
      })}
    </div>
  );
}
