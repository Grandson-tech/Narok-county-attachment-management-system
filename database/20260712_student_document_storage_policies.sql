-- Student document storage access
-- Run this in the Supabase SQL Editor as the project owner.

insert into storage.buckets (id, name, public)
values ('student-documents', 'student-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "Students can upload own document files" on storage.objects;
create policy "Students can upload own document files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'student-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Students can view own document files" on storage.objects;
create policy "Students can view own document files"
on storage.objects for select to authenticated
using (
  bucket_id = 'student-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Students can remove own document files" on storage.objects;
create policy "Students can remove own document files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'student-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
