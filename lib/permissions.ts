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
  abrechnung: ["org_owner", "org_admin", "pdl", "auditor"],
  mitarbeiter: ["org_owner", "org_admin"],
  einstellungen: ["org_owner", "org_admin", "pdl"],
};

/** A member may hold several roles in one organization (e.g. owner who also works as Pflegedienstleitung). */
export const ROLE_PRIORITY: Role[] = ["org_owner", "org_admin", "pdl", "pflegefachkraft", "pflegehilfskraft", "auditor"];
/** Roles an organization owner may additionally take on for themselves. */
export const SELF_ASSIGNABLE_ROLES: Role[] = ["pdl", "pflegefachkraft"];

export function hasAnyRole(roles: readonly string[], allowed: readonly string[]) {
  return roles.some((r) => allowed.includes(r));
}

export function roleLabels(roles: readonly Role[]) {
  return ROLE_PRIORITY.filter((r) => roles.includes(r)).map((r) => ROLE_LABEL[r]).join(" + ");
}

export function canAccess(area: string, roles: Role | readonly Role[]) {
  const list = Array.isArray(roles) ? roles : [roles as Role];
  return hasAnyRole(list, NAV_ACCESS[area] ?? []);
}
