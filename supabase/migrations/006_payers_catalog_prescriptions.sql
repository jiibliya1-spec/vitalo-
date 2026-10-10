-- Phase 1 "Vivendi parity": payers (Kostenträger), patient coverages, service catalog with prices,
-- prescriptions (Verordnungen) and priced service records.

create table public.payers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null check (char_length(name) between 1 and 160),
  payer_type text not null check (payer_type in ('pflegekasse','krankenkasse','sozialamt','selbstzahler','sonstige')),
  ik_number text check (char_length(ik_number) <= 20),
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id)
);
create index on public.payers (organization_id, name);

create table public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  code text not null check (char_length(code) between 1 and 40),
  name text not null check (char_length(name) between 1 and 200),
  billing_unit text not null check (billing_unit in ('pro_einsatz','pro_minute','pauschale')),
  price_cents integer not null check (price_cents between 0 and 10000000),
  default_duration_min integer check (default_duration_min between 1 and 1440),
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, code)
);

create table public.patient_coverages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid not null, payer_id uuid not null,
  insurance_number text check (char_length(insurance_number) <= 40),
  valid_from date not null, valid_to date check (valid_to is null or valid_to >= valid_from),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id),
  foreign key (payer_id, organization_id) references public.payers(id, organization_id)
);
create index on public.patient_coverages (patient_id, valid_from desc);

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid not null,
  kind text not null check (kind in ('haeusliche_krankenpflege','pflegeverordnung','hilfsmittel','sonstige')),
  description text not null check (char_length(description) between 1 and 1000),
  prescriber text check (char_length(prescriber) <= 160),
  frequency text check (char_length(frequency) <= 200),
  valid_from date not null, valid_to date check (valid_to is null or valid_to >= valid_from),
  status text not null default 'aktiv' check (status in ('aktiv','beendet')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id)
);
create index on public.prescriptions (organization_id, valid_to) where status = 'aktiv';
create index on public.prescriptions (patient_id);

-- priced service records: price is a server-side snapshot of the catalog entry
alter table public.service_records
  add column catalog_id uuid,
  add column unit_price_cents integer check (unit_price_cents >= 0),
  add column amount_cents integer check (amount_cents >= 0),
  add constraint service_records_catalog_fk foreign key (catalog_id, organization_id) references public.service_catalog(id, organization_id);

create or replace function private.price_service_record() returns trigger language plpgsql set search_path = '' as $$
declare c record;
begin
  if tg_op = 'UPDATE' then
    -- price fields are snapshots and cannot be edited afterwards
    new.catalog_id := old.catalog_id; new.unit_price_cents := old.unit_price_cents; new.amount_cents := old.amount_cents;
    return new;
  end if;
  new.unit_price_cents := null; new.amount_cents := null;
  if new.catalog_id is not null then
    select * into c from public.service_catalog where id = new.catalog_id and organization_id = new.organization_id and active;
    if not found then raise exception 'catalog entry not available' using errcode = '23503'; end if;
    if new.service is null or btrim(new.service) = '' then new.service := c.name; end if;
    if new.duration_min is null then new.duration_min := c.default_duration_min; end if;
    new.unit_price_cents := c.price_cents;
    new.amount_cents := case c.billing_unit when 'pro_minute' then case when new.duration_min is null then null else c.price_cents * new.duration_min end else c.price_cents end;
  end if;
  if new.service is null or btrim(new.service) = '' then raise exception 'service required' using errcode = '23514'; end if;
  return new;
end $$;
create trigger trg_service_records_price before insert or update on public.service_records for each row execute function private.price_service_record();
alter table public.service_records alter column service drop not null;

do $$
declare
  spec jsonb := $j$[
   {"t":"payers","s":null,"w":["org_owner","org_admin","pdl"],"d":true},
   {"t":"service_catalog","s":null,"w":["org_owner","org_admin","pdl"],"d":true},
   {"t":"patient_coverages","s":null,"w":["org_owner","org_admin","pdl","pflegefachkraft"],"d":true},
   {"t":"prescriptions","s":["pdl","pflegefachkraft","pflegehilfskraft","auditor"],"w":["pdl","pflegefachkraft"],"d":true}
  ]$j$::jsonb;
  r jsonb; t text; roles text; sel text;
begin
  for r in select * from jsonb_array_elements(spec) loop
    t := r->>'t';
    roles := (select string_agg(quote_literal(x), ',') from jsonb_array_elements_text(r->'w') x);
    execute format('alter table public.%I enable row level security', t);
    if r->'s' = 'null'::jsonb then
      execute format('create policy %I on public.%I for select to authenticated using (private.is_member(organization_id))', t||'_select', t);
    else
      sel := (select string_agg(quote_literal(x), ',') from jsonb_array_elements_text(r->'s') x);
      execute format('create policy %I on public.%I for select to authenticated using (private.has_role(organization_id, array[%s]::public.app_role[]))', t||'_select', t, sel);
    end if;
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_role(organization_id, array[%s]::public.app_role[]) and created_by = (select auth.uid()))', t||'_insert', t, roles);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_role(organization_id, array[%s]::public.app_role[])) with check (private.has_role(organization_id, array[%s]::public.app_role[]))', t||'_update', t, roles, roles);
    execute format('create trigger trg_%s_updated before update on public.%I for each row execute function private.set_updated_at()', t, t);
    execute format('create trigger trg_%s_orglock before update on public.%I for each row execute function private.lock_org_id()', t, t);
    execute format('create trigger trg_%s_nodelete before delete on public.%I for each row execute function private.block_delete()', t, t);
    execute format('create trigger trg_%s_audit after insert or update on public.%I for each row execute function private.audit_row()', t, t);
  end loop;
end $$;
