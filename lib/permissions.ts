export type Role = "org_owner" | "org_admin" | "pdl" | "pflegefachkraft" | "pflegehilfskraft" | "auditor";

export const ROLE_LABEL: Record<Role, string> = {
  org_owner: "Organisationsinhaber",
  org_admin: "Administrator",
  pdl: "Pflegedienstleitung",
  pflegefachkraft: "Pflegefachkraft",
  pflegehilfskraft: "Pflegehilfskraft",
  auditor: "Prüfer (nur Lesen)",
};

export const INVITABLE_ROLES: Role[] = ["org_admin", "pdl", "pflegefachkraft", "pflegehilfskraft", "auditor"];

const ALL: Role[] = ["org_owner", "org_admin", "pdl", "pflegefachkraft", "pflegehilfskraft", "auditor"];
const CLIN: Role[] = ["pdl", "pflegefachkraft", "pflegehilfskraft", "auditor"];
const MGMT: Role[] = ["org_owner", "org_admin", "pdl", "pflegefachkraft", "pflegehilfskraft", "auditor"];

/** Which roles may open which navigation area. Server-side enforcement is done by Row Level Security. */
export const NAV_ACCESS: Record<string, Role[]> = {
  dashboard: ALL,
  patienten: ALL,
  pflegeplanung: CLIN,
  pflegeberichte: CLIN,
  vitalwerte: CLIN,
  medikation: ["pdl", "pflegefachkraft", "pflegehilfskraft", "auditor"],
  wunden: CLIN,
  ereignisse: CLIN,
  aufgaben: ALL,
  besuche: MGMT,
  dienstplanung: MGMT,
  dokumente: ["pdl", "pflegefachkraft", "auditor"],
  mitarbeiter: ["org_owner", "org_admin"],
  einstellungen: ["org_owner", "org_admin", "pdl"],
};

export function canAccess(area: string, role: Role) {
  return (NAV_ACCESS[area] ?? []).includes(role);
}
