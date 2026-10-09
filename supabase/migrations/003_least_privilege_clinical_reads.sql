-- Least privilege: clinical tables are readable only by clinical roles and auditors,
-- documents only by pdl / pflegefachkraft / auditor. Administrative roles see master data, not clinical data.
do $$
declare t text;
  clinical text[] := array['allergies','diagnoses','sis_assessments','care_plans','care_plan_interventions','nursing_reports',
    'vital_signs','medication_records','medication_administrations','wounds','wound_assessments','incidents','record_corrections'];
begin
  foreach t in array clinical loop
    execute format('drop policy %I on public.%I', t||'_select', t);
    execute format($p$create policy %I on public.%I for select to authenticated using (private.has_role(organization_id, array['pdl','pflegefachkraft','pflegehilfskraft','auditor']::public.app_role[]))$p$, t||'_select', t);
  end loop;
end $$;

drop policy documents_select on public.documents;
create policy documents_select on public.documents for select to authenticated
  using (private.has_role(organization_id, array['pdl','pflegefachkraft','auditor']::public.app_role[]));
drop policy documents_insert on public.documents;
create policy documents_insert on public.documents for insert to authenticated
  with check (private.has_role(organization_id, array['pdl','pflegefachkraft']::public.app_role[]) and created_by = (select auth.uid()));

drop policy docs_storage_select on storage.objects;
create policy docs_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'patient-documents' and private.has_role(private.path_org(name), array['pdl','pflegefachkraft','auditor']::public.app_role[]));
drop policy docs_storage_insert on storage.objects;
create policy docs_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'patient-documents' and private.has_role(private.path_org(name), array['pdl','pflegefachkraft']::public.app_role[]));

drop policy doclogs_insert on public.document_access_logs;
create policy doclogs_insert on public.document_access_logs for insert to authenticated
  with check (private.has_role(organization_id, array['pdl','pflegefachkraft','auditor']::public.app_role[]) and user_id = (select auth.uid()));
