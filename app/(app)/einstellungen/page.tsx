import type { Metadata } from "next";
import { guard } from "@/components/shell/guard";
import { createClient } from "@/lib/supabase/server";
import { VITAL_KINDS, VITAL_UNITS } from "@/lib/entities";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { LocationForm, OrgForm, ThresholdForm } from "./client";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function Page() {
  const { denied, ctx } = await guard("einstellungen");
  if (denied) return denied;
  const supabase = await createClient();
  const isManager = ["org_owner", "org_admin"].includes(ctx.role);
  const [{ data: org }, { data: locs }, { data: th }, { data: sub }] = await Promise.all([
    supabase.from("organizations").select("name, org_type").eq("id", ctx.orgId).single(),
    supabase.from("care_locations").select("id, name, kind").eq("organization_id", ctx.orgId).eq("archived", false).order("name"),
    supabase.from("vital_thresholds").select("kind, min_value, max_value").eq("organization_id", ctx.orgId),
    supabase.from("subscription_accounts").select("plan, status").eq("organization_id", ctx.orgId).maybeSingle(),
  ]);
  const thMap = new Map((th ?? []).map((t) => [t.kind, t]));
  return (
    <>
      <PageHeader title="Einstellungen" description="Organisation, Standorte und Prüfgrenzen." />
      <div className="grid gap-6">
        {isManager && org && <Card className="p-4"><h2 className="mb-3 font-semibold text-navy">Organisation</h2><OrgForm name={org.name} type={org.org_type} /></Card>}
        {isManager && (
          <Card className="p-4">
            <h2 className="mb-3 font-semibold text-navy">Standorte und Wohnbereiche</h2>
            <ul className="mb-4 flex flex-wrap gap-2">{(locs ?? []).map((l) => <li key={l.id} className="rounded-full border border-line bg-bg px-3 py-1 text-sm">{l.name}</li>)}{!locs?.length && <li className="text-sm text-muted">Noch keine Standorte.</li>}</ul>
            <LocationForm />
          </Card>
        )}
        <Card className="p-4">
          <h2 className="mb-1 font-semibold text-navy">Prüfgrenzen für Vitalwerte</h2>
          <p className="mb-4 text-sm text-warn">Diese Grenzen müssen von qualifiziertem Fachpersonal festgelegt werden. Vitalo gibt keine Werte vor. Überschreitungen erzeugen nur einen Prüfhinweis, keine Diagnose, und gelten für neu erfasste Messwerte.</p>
          <div className="grid gap-3">{VITAL_KINDS.map((k) => <ThresholdForm key={k.value} kind={k.value} label={k.label} unit={VITAL_UNITS[k.value]} min={thMap.get(k.value)?.min_value ?? null} max={thMap.get(k.value)?.max_value ?? null} />)}</div>
        </Card>
        {isManager && (
          <Card className="p-4">
            <h2 className="mb-2 font-semibold text-navy">Abonnement</h2>
            <p className="flex items-center gap-2 text-sm">Tarif: <Badge value={sub?.plan ?? "trial"} tone="info" /> Status: <Badge value={sub?.status ?? "trialing"} /></p>
            <p className="mt-2 text-sm text-muted">Zahlungsabwicklung ist noch nicht angebunden. Tarifwechsel erfolgen erst nach Einrichtung eines Zahlungsanbieters.</p>
          </Card>
        )}
      </div>
    </>
  );
}
