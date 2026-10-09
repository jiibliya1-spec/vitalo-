-- 004: several roles per member, extended document categories.
-- Prerequisite for the app version that shows "Meine Fachrolle" and the Abrechnung area.

-- 1) A member may hold several roles in one organization (e.g. owner who also works as PDL).
do $$
declare c text;
begin
  select conname into c from pg_constraint
   where conrelid = 'public.organization_members'::regclass and contype = 'u'
     and (select array_agg(a.attname order by a.attname) from pg_attribute a where a.attrelid = conrelid and a.attnum = any(conkey)) = array['organization_id','user_id']::name[];
  if c is not null then execute format('alter table public.organization_members drop constraint %I', c); end if;
end $$;
alter table public.organization_members add constraint organization_members_org_user_role_key unique (organization_id, user_id, role);

-- accept_invitation must not rely on the removed (organization_id, user_id) unique constraint.
create or replace function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_inv public.invitations; v_uid uuid := auth.uid(); v_email text := lower(auth.jwt()->>'email');
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into v_inv from public.invitations where token = p_token and status = 'pending' and expires_at > now() for update;
  if not found or v_inv.email <> v_email then raise exception 'invalid invitation' using errcode = '42501'; end if;
  if not exists (select 1 from public.organization_members where organization_id = v_inv.organization_id and user_id = v_uid) then
    insert into public.organization_members (organization_id, user_id, role) values (v_inv.organization_id, v_uid, v_inv.role);
  end if;
  update public.invitations set status = 'accepted' where id = v_inv.id;
  return v_inv.organization_id;
end $$;

-- 2) Only the owner may add / remove a clinical role for themself (audited). Direct inserts stay blocked by RLS.
create or replace function public.add_own_role(p_org uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_role not in ('pdl','pflegefachkraft') then raise exception 'role not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from public.organization_members where organization_id = p_org and user_id = v_uid and role = 'org_owner') then
    raise exception 'only the owner may do this' using errcode = '42501';
  end if;
  insert into public.organization_members (organization_id, user_id, role) values (p_org, v_uid, p_role) on conflict do nothing;
  insert into public.audit_logs (organization_id, actor_id, action, table_name, record_id, metadata)
    values (p_org, v_uid, 'ROLE_ADD', 'organization_members', null, jsonb_build_object('role', p_role));
end $$;

create or replace function public.remove_own_role(p_org uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_role not in ('pdl','pflegefachkraft') then raise exception 'role not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from public.organization_members where organization_id = p_org and user_id = v_uid and role = 'org_owner') then
    raise exception 'only the owner may do this' using errcode = '42501';
  end if;
  delete from public.organization_members where organization_id = p_org and user_id = v_uid and role = p_role;
  insert into public.audit_logs (organization_id, actor_id, action, table_name, record_id, metadata)
    values (p_org, v_uid, 'ROLE_REMOVE', 'organization_members', null, jsonb_build_object('role', p_role));
end $$;

revoke all on function public.add_own_role(uuid, public.app_role) from public, anon;
revoke all on function public.remove_own_role(uuid, public.app_role) from public, anon;
grant execute on function public.add_own_role(uuid, public.app_role) to authenticated;
grant execute on function public.remove_own_role(uuid, public.app_role) to authenticated;
revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- 3) More document categories (keep in sync with lib/document-categories.ts).
alter table public.documents drop constraint if exists documents_category_check;
alter table public.documents add constraint documents_category_check check (category in (
  'arztbrief','verordnung','medikationsplan','befund','entlassbrief','pflegeplan','vertrag','vollmacht',
  'patientenverfuegung','einwilligung','pflegegrad','abrechnung','wunde','sonstiges'));
