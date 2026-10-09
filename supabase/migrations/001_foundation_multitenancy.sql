create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
grant usage on schema private to authenticated;

create type public.app_role as enum ('org_owner','org_admin','pdl','pflegefachkraft','pflegehilfskraft','auditor');

create or replace function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_profiles enable row level security;
create trigger trg_profiles_updated before update on public.user_profiles for each row execute function private.set_updated_at();

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  org_type text not null check (org_type in ('stationaer','ambulant','aki','gemischt')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.organizations enable row level security;
create trigger trg_orgs_updated before update on public.organizations for each row execute function private.set_updated_at();

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index on public.organization_members (user_id);
alter table public.organization_members enable row level security;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email = lower(email)),
  role public.app_role not null check (role <> 'org_owner'),
  token text not null unique default encode(extensions.gen_random_bytes(24),'hex'),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid not null references auth.users(id) default auth.uid(),
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);
create unique index invitations_pending_uq on public.invitations (organization_id, email) where status = 'pending';
alter table public.invitations enable row level security;

create table public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.organization_settings enable row level security;
create trigger trg_orgsettings_updated before update on public.organization_settings for each row execute function private.set_updated_at();

create table public.subscription_accounts (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  plan text not null default 'trial' check (plan in ('trial','starter','professional','enterprise')),
  status text not null default 'trialing' check (status in ('trialing','active','past_due','canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscription_accounts enable row level security;

create table public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  provider_event_id text unique,
  event_type text not null,
  created_at timestamptz not null default now()
);
alter table public.subscription_events enable row level security;

-- helper functions
create or replace function private.is_member(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members m where m.organization_id = org and m.user_id = (select auth.uid()));
$$;
create or replace function private.has_role(org uuid, roles public.app_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members m where m.organization_id = org and m.user_id = (select auth.uid()) and m.role = any(roles));
$$;
create or replace function private.shares_org(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members a join public.organization_members b on a.organization_id = b.organization_id
    where a.user_id = (select auth.uid()) and b.user_id = other);
$$;
create or replace function private.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;
grant execute on all functions in schema private to authenticated;

-- policies
create policy profiles_select on public.user_profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_org(id));
create policy profiles_update on public.user_profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy orgs_select on public.organizations for select to authenticated
  using (private.is_member(id) or private.is_platform_admin());
create policy orgs_update on public.organizations for update to authenticated
  using (private.has_role(id, array['org_owner','org_admin']::public.app_role[]))
  with check (private.has_role(id, array['org_owner','org_admin']::public.app_role[]));

create policy members_select on public.organization_members for select to authenticated
  using (private.is_member(organization_id));
create policy members_insert on public.organization_members for insert to authenticated
  with check (private.has_role(organization_id, array['org_owner','org_admin']::public.app_role[]) and role <> 'org_owner' and user_id <> (select auth.uid()));
create policy members_update on public.organization_members for update to authenticated
  using (private.has_role(organization_id, array['org_owner','org_admin']::public.app_role[]) and role <> 'org_owner' and user_id <> (select auth.uid()))
  with check (role <> 'org_owner' and user_id <> (select auth.uid()));
create policy members_delete on public.organization_members for delete to authenticated
  using (private.has_role(organization_id, array['org_owner','org_admin']::public.app_role[]) and role <> 'org_owner' and user_id <> (select auth.uid()));

create policy invitations_select on public.invitations for select to authenticated
  using (private.has_role(organization_id, array['org_owner','org_admin']::public.app_role[]));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (private.has_role(organization_id, array['org_owner','org_admin']::public.app_role[]) and invited_by = (select auth.uid()) and status = 'pending');
create policy invitations_update on public.invitations for update to authenticated
  using (private.has_role(organization_id, array['org_owner','org_admin']::public.app_role[]))
  with check (status in ('pending','revoked'));

create policy settings_select on public.organization_settings for select to authenticated
  using (private.is_member(organization_id));
create policy settings_update on public.organization_settings for update to authenticated
  using (private.has_role(organization_id, array['org_owner','org_admin']::public.app_role[]))
  with check (private.has_role(organization_id, array['org_owner','org_admin']::public.app_role[]));

create policy subs_select on public.subscription_accounts for select to authenticated
  using (private.has_role(organization_id, array['org_owner','org_admin']::public.app_role[]) or private.is_platform_admin());

-- RPCs (the only way to create an organization or accept an invitation)
create or replace function public.create_organization(p_name text, p_org_type text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  insert into public.organizations (name, org_type, created_by) values (trim(p_name), p_org_type, v_uid) returning id into v_org;
  insert into public.organization_members (organization_id, user_id, role) values (v_org, v_uid, 'org_owner');
  insert into public.organization_settings (organization_id) values (v_org);
  insert into public.subscription_accounts (organization_id) values (v_org);
  return v_org;
end $$;

create or replace function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_inv public.invitations; v_uid uuid := auth.uid(); v_email text := lower(auth.jwt()->>'email');
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into v_inv from public.invitations where token = p_token and status = 'pending' and expires_at > now() for update;
  if not found or v_inv.email <> v_email then raise exception 'invalid invitation' using errcode = '42501'; end if;
  insert into public.organization_members (organization_id, user_id, role) values (v_inv.organization_id, v_uid, v_inv.role)
    on conflict (organization_id, user_id) do nothing;
  update public.invitations set status = 'accepted' where id = v_inv.id;
  return v_inv.organization_id;
end $$;

revoke all on function public.create_organization(text,text) from public, anon;
revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.create_organization(text,text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
