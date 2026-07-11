-- NCAMS document-review access repair
-- Run this in Supabase SQL Editor as the project owner.

alter table public.documents enable row level security;

drop policy if exists "Students can view own documents" on public.documents;
create policy "Students can view own documents"
on public.documents for select to authenticated
using (student_id = auth.uid());

drop policy if exists "Students can upload own documents" on public.documents;
create policy "Students can upload own documents"
on public.documents for insert to authenticated
with check (student_id = auth.uid());

drop policy if exists "Students can delete own pending documents" on public.documents;
create policy "Students can delete own pending documents"
on public.documents for delete to authenticated
using (student_id = auth.uid() and review_status = 'pending');

drop policy if exists "Staff can view all documents" on public.documents;
create policy "Staff can view all documents"
on public.documents for select to authenticated
using (public.is_staff());

drop policy if exists "Staff can update all documents" on public.documents;
create policy "Staff can update all documents"
on public.documents for update to authenticated
using (public.is_staff()) with check (public.is_staff());

-- Storage objects remain private. Staff receive temporary signed URLs only.
drop policy if exists "Staff can view all uploaded files" on storage.objects;
create policy "Staff can view all uploaded files"
on storage.objects for select to authenticated
using (bucket_id = 'student-documents' and public.is_staff());
