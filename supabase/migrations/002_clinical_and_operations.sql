create table public.care_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  kind text not null default 'wohnbereich' check (kind in ('wohnbereich','standort','tour','intensiv')),
  archived boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  birth_date date not null check (birth_date <= current_date),
  gender text check (gender in ('w','m','d','x')),
  status text not null default 'aktiv' check (status in ('aufnahme_geplant','aktiv','entlassen')),
  room text check (char_length(room) <= 20),
  pflegegrad smallint check (pflegegrad between 1 and 5),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (location_id, organization_id) references public.care_locations(id, organization_id)
);
create index patients_org_name_idx on public.patients (organization_id, last_name, first_name);
create index patients_org_status_idx on public.patients (organization_id, status);

create table public.patient_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  relation text check (char_length(relation) <= 80),
  phone text check (char_length(phone) <= 40),
  is_authorized boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id)
);
create index on public.patient_contacts (patient_id);

create table public.patient_admissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid not null,
  admitted_on date not null, discharged_on date check (discharged_on is null or discharged_on >= admitted_on),
  reason text check (char_length(reason) <= 500),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id)
);
create index on public.patient_admissions (patient_id);

create table public.patient_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid not null,
  consent_type text not null check (char_length(consent_type) between 1 and 120),
  granted boolean not null, given_on date not null default current_date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id)
);
create index on public.patient_consents (patient_id);

create table public.allergies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid not null,
  substance text not null check (char_length(substance) between 1 and 120),
  reaction text check (char_length(reaction) <= 300),
  severity text check (severity in ('leicht','mittel','schwer')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id)
);
create index on public.allergies (patient_id);

create table public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid not null,
  description text not null check (char_length(description) between 1 and 300),
  icd_code text check (char_length(icd_code) <= 12),
  since date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id)
);
create index on public.diagnoses (patient_id);

create table public.sis_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid not null,
  status text not null default 'draft' check (status in ('draft','final')),
  kognitiv_kommunikativ text not null default '',
  mobilitaet text not null default '',
  krankheitsbezogen text not null default '',
  selbstversorgung text not null default '',
  soziale_beziehungen text not null default '',
  wohnen_haeuslichkeit text not null default '',
  risks text not null default '',
  assessed_at timestamptz not null default now(),
  finalized_at timestamptz, finalized_by uuid references auth.users(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id)
);
create index on public.sis_assessments (patient_id, assessed_at desc);

create table public.care_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid not null, sis_id uuid,
  goal text not null check (char_length(goal) between 1 and 1000),
  status text not null default 'aktiv' check (status in ('aktiv','abgeschlossen')),
  review_date date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id),
  foreign key (sis_id, organization_id) references public.sis_assessments(id, organization_id)
);
create index on public.care_plans (patient_id);
create index on public.care_plans (organization_id, review_date) where status = 'aktiv';

create table public.care_plan_interventions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, care_plan_id uuid not null,
  description text not null check (char_length(description) between 1 and 1000),
  responsible text check (char_length(responsible) <= 120),
  frequency text check (char_length(frequency) <= 120),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (care_plan_id, organization_id) references public.care_plans(id, organization_id)
);
create index on public.care_plan_interventions (care_plan_id);

create table public.nursing_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid not null,
  category text not null check (category in ('pflegebericht','beobachtung','massnahme','reaktion','verlauf','besonderes_vorkommnis')),
  content text not null check (char_length(content) between 1 and 8000),
  event_time timestamptz not null,
  status text not null default 'draft' check (status in ('draft','final')),
  finalized_at timestamptz, finalized_by uuid references auth.users(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id)
);
create index on public.nursing_reports (patient_id, event_time desc);
create index on public.nursing_reports (organization_id, event_time desc);
create index on public.nursing_reports (organization_id, created_by);

create table public.vital_thresholds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('blutdruck','puls','temperatur','spo2','atemfrequenz','gewicht','blutzucker')),
  min_value numeric, max_value numeric,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, kind),
  check (min_value is null or max_value is null or min_value <= max_value)
);

create table public.vital_signs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid not null,
  kind text not null check (kind in ('blutdruck','puls','temperatur','spo2','atemfrequenz','gewicht','blutzucker')),
  value numeric not null check (value > 0),
  value2 numeric check (value2 is null or value2 > 0),
  unit text not null check (char_length(unit) between 1 and 12),
  measured_at timestamptz not null,
  flagged boolean not null default false,
  note text check (char_length(note) <= 500),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (kind <> 'blutdruck' or value2 is not null),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id)
);
create index on public.vital_signs (patient_id, kind, measured_at desc);

create table public.medication_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid not null,
  name text not null check (char_length(name) between 1 and 160),
  dosage text not null check (char_length(dosage) between 1 and 160),
  schedule text not null check (char_length(schedule) between 1 and 300),
  instructions text check (char_length(instructions) <= 1000),
  prescriber text check (char_length(prescriber) <= 160),
  active boolean not null default true,
  start_date date, end_date date check (end_date is null or start_date is null or end_date >= start_date),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id)
);
create index on public.medication_records (patient_id) where active;

create table public.medication_administrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid not null, medication_id uuid not null,
  status text not null check (status in ('gegeben','verweigert','ausgelassen')),
  scheduled_at timestamptz, administered_at timestamptz not null,
  note text check (char_length(note) <= 500),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id),
  foreign key (medication_id, organization_id) references public.medication_records(id, organization_id)
);
create index on public.medication_administrations (patient_id, administered_at desc);

create table public.wounds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid not null,
  body_location text not null check (char_length(body_location) between 1 and 160),
  wound_type text not null check (char_length(wound_type) between 1 and 120),
  status text not null default 'aktiv' check (status in ('aktiv','abgeheilt')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id)
);
create index on public.wounds (patient_id);

create table public.wound_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, wound_id uuid not null,
  assessed_at timestamptz not null,
  size_text text check (char_length(size_text) <= 80),
  observation text not null check (char_length(observation) between 1 and 2000),
  treatment text check (char_length(treatment) <= 2000),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (wound_id, organization_id) references public.wounds(id, organization_id)
);
create index on public.wound_assessments (wound_id, assessed_at desc);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid,
  category text not null check (category in ('sturz','medikation','verhalten','verletzung','sonstiges')),
  event_time timestamptz not null,
  description text not null check (char_length(description) between 1 and 4000),
  actions_taken text check (char_length(actions_taken) <= 2000),
  follow_up text check (char_length(follow_up) <= 2000),
  review_status text not null default 'offen' check (review_status in ('offen','in_pruefung','abgeschlossen')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id)
);
create index on public.incidents (organization_id, review_status, event_time desc);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 2000),
  due_at timestamptz,
  priority text not null default 'normal' check (priority in ('niedrig','normal','hoch')),
  status text not null default 'offen' check (status in ('offen','erledigt','storniert','pruefung')),
  assigned_to uuid references auth.users(id),
  completed_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id)
);
create index on public.tasks (organization_id, status, due_at);
create index on public.tasks (assigned_to) where status = 'offen';

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, location_id uuid,
  user_id uuid not null references auth.users(id),
  shift_type text not null check (shift_type in ('frueh','spaet','nacht','tag')),
  starts_at timestamptz not null, ends_at timestamptz not null,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  foreign key (location_id, organization_id) references public.care_locations(id, organization_id)
);
create index on public.shifts (organization_id, starts_at);

create table public.handovers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, location_id uuid,
  note text not null check (char_length(note) between 1 and 4000),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (location_id, organization_id) references public.care_locations(id, organization_id)
);
create index on public.handovers (organization_id, created_at desc);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid not null,
  assigned_to uuid references auth.users(id),
  planned_start timestamptz not null, planned_end timestamptz not null,
  started_at timestamptz, ended_at timestamptz,
  status text not null default 'geplant' check (status in ('geplant','begonnen','abgeschlossen','ausgefallen')),
  note text check (char_length(note) <= 2000),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id),
  check (planned_end > planned_start),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id)
);
create index on public.visits (organization_id, planned_start);
create index on public.visits (assigned_to, planned_start);

create table public.service_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, visit_id uuid not null,
  service text not null check (char_length(service) between 1 and 200),
  duration_min integer check (duration_min between 1 and 1440),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (visit_id, organization_id) references public.visits(id, organization_id)
);
create index on public.service_records (visit_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, patient_id uuid not null,
  category text not null default 'sonstiges' check (category in ('arztbrief','vertrag','wunde','sonstiges')),
  filename text not null check (char_length(filename) between 1 and 200),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (patient_id, organization_id) references public.patients(id, organization_id)
);
create index on public.documents (patient_id);

create table public.document_access_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id),
  user_id uuid not null default auth.uid() references auth.users(id),
  action text not null check (action in ('view','download','upload')),
  created_at timestamptz not null default now()
);
create index on public.document_access_logs (document_id, created_at desc);

create table public.record_corrections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  table_name text not null check (table_name in ('nursing_reports','sis_assessments','vital_signs','medication_administrations','wound_assessments','incidents')),
  record_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 1000),
  corrected_content text not null check (char_length(corrected_content) between 1 and 8000),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.record_corrections (table_name, record_id);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_id uuid,
  action text not null,
  table_name text not null,
  record_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs (organization_id, created_at desc);

-- trigger functions
create or replace function private.lock_org_id() returns trigger language plpgsql set search_path = '' as $$
begin
  if to_jsonb(new)->>'organization_id' is distinct from to_jsonb(old)->>'organization_id' then
    raise exception 'organization_id is immutable' using errcode = '42501';
  end if;
  return new;
end $$;

create or replace function private.block_delete() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'clinical records cannot be deleted' using errcode = '42501'; end $$;

create or replace function private.block_update() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'record is immutable, use a correction entry' using errcode = '42501'; end $$;

create or replace function private.block_when_final() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'final' then raise exception 'finalized record is immutable, use a correction entry' using errcode = '42501'; end if;
  if new.status = 'final' then new.finalized_at := now(); new.finalized_by := auth.uid(); end if;
  return new;
end $$;

create or replace function private.block_when_closed() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.review_status = 'abgeschlossen' then raise exception 'closed incident is immutable' using errcode = '42501'; end if;
  return new;
end $$;

create or replace function private.flag_vital() returns trigger language plpgsql security definer set search_path = '' as $$
declare t public.vital_thresholds;
begin
  select * into t from public.vital_thresholds where organization_id = new.organization_id and kind = new.kind;
  new.flagged := found and ((t.min_value is not null and new.value < t.min_value) or (t.max_value is not null and new.value > t.max_value));
  return new;
end $$;

create or replace function private.audit_row() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_logs (organization_id, actor_id, action, table_name, record_id, metadata)
  values ((to_jsonb(new)->>'organization_id')::uuid, auth.uid(), tg_op, tg_table_name, (to_jsonb(new)->>'id')::uuid,
          jsonb_build_object('status', coalesce(to_jsonb(new)->>'status', to_jsonb(new)->>'review_status')));
  return null;
end $$;

create trigger trg_vital_flag before insert on public.vital_signs for each row execute function private.flag_vital();
create trigger trg_reports_final before update on public.nursing_reports for each row execute function private.block_when_final();
create trigger trg_sis_final before update on public.sis_assessments for each row execute function private.block_when_final();
create trigger trg_incident_closed before update on public.incidents for each row execute function private.block_when_closed();
create trigger trg_vitals_immutable before update on public.vital_signs for each row execute function private.block_update();
create trigger trg_admin_immutable before update on public.medication_administrations for each row execute function private.block_update();
create trigger trg_wound_assess_immutable before update on public.wound_assessments for each row execute function private.block_update();
create trigger trg_corrections_immutable before update on public.record_corrections for each row execute function private.block_update();
create trigger trg_documents_immutable before update on public.documents for each row execute function private.block_update();

-- generic: RLS, policies, updated_at, org lock, delete protection, audit
do $$
declare
  spec jsonb := $j$[
   {"t":"care_locations","w":["org_owner","org_admin"],"u":true,"a":false,"d":false},
   {"t":"patients","w":["org_owner","org_admin","pdl","pflegefachkraft"],"u":true,"a":true,"d":true},
   {"t":"patient_contacts","w":["org_owner","org_admin","pdl","pflegefachkraft"],"u":true,"a":false,"d":true},
   {"t":"patient_admissions","w":["org_owner","org_admin","pdl","pflegefachkraft"],"u":true,"a":false,"d":true},
   {"t":"patient_consents","w":["org_owner","org_admin","pdl","pflegefachkraft"],"u":true,"a":false,"d":true},
   {"t":"allergies","w":["pdl","pflegefachkraft"],"u":true,"a":false,"d":true},
   {"t":"diagnoses","w":["pdl","pflegefachkraft"],"u":true,"a":false,"d":true},
   {"t":"sis_assessments","w":["pdl","pflegefachkraft"],"u":true,"a":true,"d":true},
   {"t":"care_plans","w":["pdl","pflegefachkraft"],"u":true,"a":true,"d":true},
   {"t":"care_plan_interventions","w":["pdl","pflegefachkraft"],"u":true,"a":false,"d":true},
   {"t":"nursing_reports","w":["pdl","pflegefachkraft","pflegehilfskraft"],"u":true,"a":true,"d":true},
   {"t":"vital_thresholds","w":["org_owner","org_admin","pdl"],"u":true,"a":false,"d":false},
   {"t":"vital_signs","w":["pdl","pflegefachkraft","pflegehilfskraft"],"u":false,"a":true,"d":true},
   {"t":"medication_records","w":["pdl","pflegefachkraft"],"u":true,"a":true,"d":true},
   {"t":"medication_administrations","w":["pdl","pflegefachkraft"],"u":false,"a":true,"d":true},
   {"t":"wounds","w":["pdl","pflegefachkraft"],"u":true,"a":true,"d":true},
   {"t":"wound_assessments","w":["pdl","pflegefachkraft"],"u":false,"a":true,"d":true},
   {"t":"incidents","w":["pdl","pflegefachkraft","pflegehilfskraft"],"u":true,"a":true,"d":true},
   {"t":"tasks","w":["org_owner","org_admin","pdl","pflegefachkraft","pflegehilfskraft"],"u":true,"a":false,"d":false},
   {"t":"shifts","w":["org_owner","org_admin","pdl"],"u":true,"a":false,"d":false},
   {"t":"handovers","w":["pdl","pflegefachkraft","pflegehilfskraft"],"u":true,"a":false,"d":true},
   {"t":"visits","w":["org_owner","org_admin","pdl","pflegefachkraft","pflegehilfskraft"],"u":true,"a":false,"d":true},
   {"t":"service_records","w":["org_owner","org_admin","pdl","pflegefachkraft","pflegehilfskraft"],"u":true,"a":false,"d":true},
   {"t":"documents","w":["org_owner","org_admin","pdl","pflegefachkraft"],"u":false,"a":true,"d":true},
   {"t":"record_corrections","w":["pdl","pflegefachkraft"],"u":false,"a":true,"d":true}
  ]$j$::jsonb;
  r jsonb; t text; roles text;
begin
  for r in select * from jsonb_array_elements(spec) loop
    t := r->>'t';
    roles := (select string_agg(quote_literal(x), ',') from jsonb_array_elements_text(r->'w') x);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (private.is_member(organization_id))', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_role(organization_id, array[%s]::public.app_role[]) and created_by = (select auth.uid()))', t||'_insert', t, roles);
    if (r->>'u')::boolean then
      execute format('create policy %I on public.%I for update to authenticated using (private.has_role(organization_id, array[%s]::public.app_role[])) with check (private.has_role(organization_id, array[%s]::public.app_role[]))', t||'_update', t, roles, roles);
    end if;
    execute format('create trigger trg_%s_updated before update on public.%I for each row execute function private.set_updated_at()', t, t);
    execute format('create trigger trg_%s_orglock before update on public.%I for each row execute function private.lock_org_id()', t, t);
    if (r->>'d')::boolean then
      execute format('create trigger trg_%s_nodelete before delete on public.%I for each row execute function private.block_delete()', t, t);
    end if;
    if (r->>'a')::boolean then
      execute format('create trigger trg_%s_audit after insert or update on public.%I for each row execute function private.audit_row()', t, t);
    end if;
  end loop;
end $$;

-- audit logs and document access logs
alter table public.audit_logs enable row level security;
create policy audit_select on public.audit_logs for select to authenticated
  using (private.has_role(organization_id, array['org_owner','org_admin','pdl','auditor']::public.app_role[]));
create trigger trg_audit_immutable before update or delete on public.audit_logs for each row execute function private.block_update();

alter table public.document_access_logs enable row level security;
create policy doclogs_select on public.document_access_logs for select to authenticated
  using (private.has_role(organization_id, array['org_owner','org_admin','pdl','auditor']::public.app_role[]));
create policy doclogs_insert on public.document_access_logs for insert to authenticated
  with check (private.is_member(organization_id) and user_id = (select auth.uid()));

-- storage: private bucket, org/patient folder convention
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patient-documents','patient-documents', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do nothing;

create or replace function private.path_org(p text) returns uuid language plpgsql immutable set search_path = '' as $$
begin return split_part(p, '/', 1)::uuid; exception when others then return null; end $$;
grant execute on function private.path_org(text) to authenticated;

create policy docs_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'patient-documents' and private.is_member(private.path_org(name)));
create policy docs_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'patient-documents' and private.has_role(private.path_org(name), array['org_owner','org_admin','pdl','pflegefachkraft']::public.app_role[]));
