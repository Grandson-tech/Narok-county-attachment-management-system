-- NCAMS student-management extension
-- Run this once in Supabase SQL Editor before testing the updated forms.

create table if not exists public.supervisors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  department_id uuid references public.departments(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists gender text check (gender in ('female', 'male', 'prefer_not_to_say')),
  add column if not exists registration_number text,
  add column if not exists year_of_study integer check (year_of_study between 1 and 8),
  add column if not exists attachment_year integer check (attachment_year between 2020 and 2100),
  add column if not exists supervisor_id uuid references public.supervisors(id) on delete set null,
  add column if not exists archived_at timestamptz;

create table if not exists public.application_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  details text,
  performed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.supervisors enable row level security;
alter table public.application_events enable row level security;

drop policy if exists "Authenticated users can view supervisors" on public.supervisors;
create policy "Authenticated users can view supervisors"
on public.supervisors for select to authenticated using (true);

drop policy if exists "Staff can manage supervisors" on public.supervisors;
create policy "Staff can manage supervisors"
on public.supervisors for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Students can view own application events" on public.application_events;
create policy "Students can view own application events"
on public.application_events for select to authenticated using (student_id = auth.uid());

drop policy if exists "Staff can manage application events" on public.application_events;
create policy "Staff can manage application events"
on public.application_events for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Store the new registration fields supplied by the frontend.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, email, phone, national_id, institution, course,
    gender, registration_number, year_of_study, attachment_year
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New Student'),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'national_id',
    new.raw_user_meta_data ->> 'institution',
    new.raw_user_meta_data ->> 'course',
    new.raw_user_meta_data ->> 'gender',
    new.raw_user_meta_data ->> 'registration_number',
    nullif(new.raw_user_meta_data ->> 'year_of_study', '')::integer,
    nullif(new.raw_user_meta_data ->> 'attachment_year', '')::integer
  );

  insert into public.application_events (student_id, event_type, details)
  values (new.id, 'application_submitted', 'Student account and attachment application created.');
  return new;
end;
$$;
