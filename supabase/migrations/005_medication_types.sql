-- Medication type: regular, as-needed (Bedarf) and narcotics (BtM); optional indication.
alter table public.medication_records
  add column if not exists med_type text not null default 'regulaer' check (med_type in ('regulaer','bedarf','btm')),
  add column if not exists indication text check (char_length(indication) <= 300);
create index if not exists medication_records_org_type_idx on public.medication_records (organization_id, med_type) where active;
