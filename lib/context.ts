import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/permissions";

export type Membership = { organization_id: string; role: Role; organizations: { id: string; name: string; org_type: string } };
export const ORG_COOKIE = "vitalo_org";

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

export const getMemberships = cache(async (): Promise<Membership[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(id, name, org_type)")
    .eq("user_id", user.id)
    .order("created_at");
  return (data ?? []) as unknown as Membership[];
});

/** Resolves the active organization. The cookie is only a hint: it is validated against real memberships. */
export const getContext = cache(async () => {
  const user = await getUser();
  if (!user) redirect("/login");
  const memberships = await getMemberships();
  if (memberships.length === 0) redirect("/onboarding");
  const wanted = (await cookies()).get(ORG_COOKIE)?.value;
  const active = memberships.find((m) => m.organization_id === wanted) ?? memberships[0];
  return { user, memberships, orgId: active.organization_id, org: active.organizations, role: active.role };
});

export async function requireWriteContext() {
  const ctx = await getContext();
  return { ...ctx, supabase: await createClient() };
}
