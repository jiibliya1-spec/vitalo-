import { getContext } from "@/lib/context";
import { createClient } from "@/lib/supabase/server";
import { canAccess, NAV_ACCESS, roleLabels } from "@/lib/permissions";
import { AppShell, type NavItem } from "@/components/shell/app-shell";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard", patienten: "Patienten", pflegeplanung: "Pflegeplanung", pflegeberichte: "Pflegeberichte", vitalwerte: "Vitalwerte",
  medikation: "Medikation", wunden: "Wunden", ereignisse: "Ereignisse", aufgaben: "Aufgaben", besuche: "Touren & Besuche",
  dienstplanung: "Dienstplanung", dokumente: "Dokumente", berichte: "Auswertungen", abrechnung: "Abrechnung", mitarbeiter: "Mitarbeiter", einstellungen: "Einstellungen",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, orgs, orgId, org, roles } = await getContext();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("user_profiles").select("full_name").eq("id", user.id).maybeSingle();
  const nav = Object.keys(NAV_ACCESS).filter((k) => canAccess(k, roles)).map((key) => ({ key, label: LABELS[key] })) as NavItem[];
  return (
    <AppShell
      nav={nav}
      orgName={org.name}
      orgs={orgs.map((o) => ({ id: o.id, name: o.name }))}
      activeOrgId={orgId}
      userName={profile?.full_name || user.email || ""}
      roleLabel={roleLabels(roles)}
    >
      {children}
    </AppShell>
  );
}
