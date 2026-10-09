import type { Metadata } from "next";
import { guard } from "@/components/shell/guard";
import { createClient } from "@/lib/supabase/server";
import { loadMembers } from "@/lib/options";
import { fmtDateTime } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui/primitives";
import { InviteForm, InviteRow, MemberRow } from "./client";

export const metadata: Metadata = { title: "Mitarbeiter" };

export default async function Page() {
  const { denied, ctx } = await guard("mitarbeiter");
  if (denied) return denied;
  const supabase = await createClient();
  const [members, inv] = await Promise.all([
    loadMembers(supabase, ctx.orgId),
    supabase.from("invitations").select("id, email, role, token, expires_at, created_at").eq("organization_id", ctx.orgId).eq("status", "pending").order("created_at", { ascending: false }),
  ]);
  const { data: rows } = await supabase.from("organization_members").select("id, user_id, role").eq("organization_id", ctx.orgId);
  const name = new Map(members.map((m) => [m.id, m.name]));
  return (
    <>
      <PageHeader title="Mitarbeiter" description="Zugänge und Rollen verwalten. Änderungen wirken sofort." />
      <div className="grid gap-6">
        <Card className="p-4"><h2 className="mb-3 font-semibold text-navy">Person einladen</h2><InviteForm /></Card>
        <Card>
          <h2 className="border-b border-line px-4 py-3 font-semibold text-navy">Mitglieder</h2>
          <ul className="divide-y divide-line">
            {(rows ?? []).map((m) => (
              <MemberRow key={m.id} id={m.id} name={name.get(m.user_id) ?? "Unbekannt"} role={m.role} isSelf={m.user_id === ctx.user.id} />
            ))}
          </ul>
        </Card>
        {!!inv.data?.length && (
          <Card>
            <h2 className="border-b border-line px-4 py-3 font-semibold text-navy">Offene Einladungen</h2>
            <ul className="divide-y divide-line">
              {inv.data.map((i) => (
                <InviteRow key={i.id} id={i.id} email={i.email} role={i.role} expires={fmtDateTime(i.expires_at)} tokenPath={`/einladung/${i.token}`} />
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
