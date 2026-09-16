-- ─────────────────────────────────────────────────────────────
-- STUDY HUB PLATFORM - SUPABASE DATABASE SCHEMA
-- Phase 1 & Phase 2: Multi-Education Architecture, Parent & Admin Extensions, RLS
-- ─────────────────────────────────────────────────────────────

-- 1. PROFILES TABLE (Core authentication & role metadata)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  language text default 'en',
  role text default 'USER', -- 'USER' (Student), 'PARENT', 'ADMIN'
  is_disabled boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. SCHEDULE COLUMNS TABLE
create table if not exists public.schedule_columns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  col_key text not null,
  title text not null,
  position integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, col_key)
);

-- 3. SCHEDULE SESSIONS TABLE (Template sessions)
create table if not exists public.schedule_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_name text not null, -- 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'
  col_key text not null,
  text text not null,
  icon text default 'book',
  color text default 'green',
  pinned boolean default false,
  position integer default 0,
  notes text,
  teacher text,
  time_range text,
  duration text,
  priority text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. WEEKLY DATA TABLE (Weekly item check states & daily goals)
create table if not exists public.weekly_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_key text not null, -- e.g. '2026-09-05'
  items jsonb default '{}'::jsonb,
  goals jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, week_key)
);

-- 5. USER META TABLE (Streaks & progress tracker)
create table if not exists public.user_meta (
  user_id uuid primary key references auth.users(id) on delete cascade,
  streak integer default 0,
  longest_streak integer default 0,
  last_check_date text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. LEGACY / HYBRID BACKWARD-COMPATIBLE TABLE
create table if not exists public.schedule_data (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id, user_id)
);

-- 7. SUBJECTS TABLE (Personal Curriculum)
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text default 'green',
  total_lessons integer default 20,
  covered_lessons integer default 0,
  target_weekly_hours numeric default 5.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, name)
);

-- ─────────────────────────────────────────────────────────────
-- MULTI-EDUCATION SYSTEM TABLES
-- ─────────────────────────────────────────────────────────────

-- 8. EDUCATION SYSTEMS TABLE
create table if not exists public.education_systems (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  description text,
  status text default 'ACTIVE', -- 'ACTIVE', 'INACTIVE'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. ACADEMIC LEVELS TABLE
create table if not exists public.academic_levels (
  id uuid primary key default gen_random_uuid(),
  education_system_id uuid not null references public.education_systems(id) on delete cascade,
  name text not null,
  code text not null,
  order_index integer default 0,
  status text default 'ACTIVE',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (education_system_id, code)
);

-- 10. ACADEMIC TRACKS TABLE (Optional)
create table if not exists public.academic_tracks (
  id uuid primary key default gen_random_uuid(),
  academic_level_id uuid not null references public.academic_levels(id) on delete cascade,
  name text not null,
  code text not null,
  order_index integer default 0,
  status text default 'ACTIVE',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (academic_level_id, code)
);

-- 11. ACADEMIC YEARS TABLE
create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, -- e.g. '2026/2027'
  start_date date,
  end_date date,
  status text default 'ACTIVE',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. STUDENT ACADEMIC PROFILES TABLE
create table if not exists public.student_academic_profiles (
  student_id uuid primary key references auth.users(id) on delete cascade,
  education_system_id uuid not null references public.education_systems(id),
  academic_level_id uuid not null references public.academic_levels(id),
  track_id uuid references public.academic_tracks(id),
  academic_year_id uuid not null references public.academic_years(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ─────────────────────────────────────────────────────────────
-- MASTER & FORCE CURRICULUM TABLES
-- ─────────────────────────────────────────────────────────────

-- 13. MASTER CURRICULA TABLE
create table if not exists public.master_curricula (
  id uuid primary key default gen_random_uuid(),
  education_system_id uuid not null references public.education_systems(id),
  academic_level_id uuid not null references public.academic_levels(id),
  track_id uuid references public.academic_tracks(id),
  academic_year_id uuid not null references public.academic_years(id),
  title text not null,
  description text,
  created_by uuid references auth.users(id),
  status text default 'DRAFT', -- 'DRAFT', 'PUBLISHED', 'ARCHIVED'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 14. MASTER SUBJECTS TABLE
create table if not exists public.master_subjects (
  id uuid primary key default gen_random_uuid(),
  master_curriculum_id uuid not null references public.master_curricula(id) on delete cascade,
  name text not null,
  emoji text default '📚',
  color text default 'var(--blue)',
  order_index integer default 0
);

-- 15. MASTER UNITS TABLE
create table if not exists public.master_units (
  id uuid primary key default gen_random_uuid(),
  master_subject_id uuid not null references public.master_subjects(id) on delete cascade,
  title text not null,
  order_index integer default 0
);

-- 16. MASTER LESSONS TABLE
create table if not exists public.master_lessons (
  id uuid primary key default gen_random_uuid(),
  master_unit_id uuid not null references public.master_units(id) on delete cascade,
  title text not null,
  order_index integer default 0
);

-- 17. FORCE CURRICULUM ASSIGNMENTS TABLE
create table if not exists public.force_curriculum_assignments (
  id uuid primary key default gen_random_uuid(),
  master_curriculum_id uuid not null references public.master_curricula(id) on delete cascade,
  education_system_id uuid not null references public.education_systems(id),
  academic_level_id uuid not null references public.academic_levels(id),
  track_id uuid references public.academic_tracks(id), -- Nullable = applies to all tracks in level
  academic_year_id uuid not null references public.academic_years(id),
  is_active boolean default true,
  published_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 18. STUDENT REQUIRED CURRICULUM PROGRESS TABLE
create table if not exists public.student_required_curriculum_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  master_lesson_id uuid not null references public.master_lessons(id) on delete cascade,
  stage_exp boolean default false,
  stage_sol boolean default false,
  stage_rev boolean default false,
  stage_test boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (student_id, master_lesson_id)
);

-- ─────────────────────────────────────────────────────────────
-- PARENT / STUDENT RELATIONSHIPS & CONNECTION CODES
-- ─────────────────────────────────────────────────────────────

-- 19. PARENT STUDENT RELATIONSHIPS TABLE
create table if not exists public.parent_student_relationships (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text default 'PENDING', -- 'PENDING', 'ACTIVE', 'REJECTED', 'REVOKED'
  approved_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (parent_id, student_id)
);

-- 20. CONNECTION CODES TABLE
create table if not exists public.connection_codes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  raw_code text not null unique,
  code_hash text,
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ─────────────────────────────────────────────────────────────
-- AUDIT LOGS TABLE
-- ─────────────────────────────────────────────────────────────

-- 21. AUDIT LOGS TABLE
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ─────────────────────────────────────────────────────────────
-- SECURITY & AUTHORIZATION HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN' and coalesce(is_disabled, false) = false
  );
end;
$$ language plpgsql security definer;

create or replace function public.is_parent()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'PARENT' and coalesce(is_disabled, false) = false
  );
end;
$$ language plpgsql security definer;

create or replace function public.is_linked_parent(target_student_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.parent_student_relationships
    where parent_id = auth.uid()
      and student_id = target_student_id
      and status = 'ACTIVE'
  );
end;
$$ language plpgsql security definer;

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.schedule_columns enable row level security;
alter table public.schedule_sessions enable row level security;
alter table public.weekly_data enable row level security;
alter table public.user_meta enable row level security;
alter table public.schedule_data enable row level security;
alter table public.subjects enable row level security;
alter table public.education_systems enable row level security;
alter table public.academic_levels enable row level security;
alter table public.academic_tracks enable row level security;
alter table public.academic_years enable row level security;
alter table public.student_academic_profiles enable row level security;
alter table public.master_curricula enable row level security;
alter table public.master_subjects enable row level security;
alter table public.master_units enable row level security;
alter table public.master_lessons enable row level security;
alter table public.force_curriculum_assignments enable row level security;
alter table public.student_required_curriculum_progress enable row level security;
alter table public.parent_student_relationships enable row level security;
alter table public.connection_codes enable row level security;
alter table public.audit_logs enable row level security;

-- PROFILES RLS
drop policy if exists "Users read write own profile" on public.profiles;
create policy "Users read write own profile" on public.profiles
  for all using (
    auth.uid() = id or public.is_admin() or public.is_linked_parent(id)
  ) with check (
    auth.uid() = id or public.is_admin()
  );

-- SCHEDULE COLUMNS RLS
drop policy if exists "Users manage own columns" on public.schedule_columns;
create policy "Users manage own columns" on public.schedule_columns
  for all using (
    auth.uid() = user_id or public.is_admin() or public.is_linked_parent(user_id)
  ) with check (
    auth.uid() = user_id or public.is_admin()
  );

-- SCHEDULE SESSIONS RLS
drop policy if exists "Users manage own sessions" on public.schedule_sessions;
create policy "Users manage own sessions" on public.schedule_sessions
  for all using (
    auth.uid() = user_id or public.is_admin() or public.is_linked_parent(user_id)
  ) with check (
    auth.uid() = user_id or public.is_admin()
  );

-- WEEKLY DATA RLS
drop policy if exists "Users manage own weekly data" on public.weekly_data;
create policy "Users manage own weekly data" on public.weekly_data
  for all using (
    auth.uid() = user_id or public.is_admin() or public.is_linked_parent(user_id)
  ) with check (
    auth.uid() = user_id or public.is_admin()
  );

-- USER META RLS
drop policy if exists "Users manage own meta" on public.user_meta;
create policy "Users manage own meta" on public.user_meta
  for all using (
    auth.uid() = user_id or public.is_admin() or public.is_linked_parent(user_id)
  ) with check (
    auth.uid() = user_id or public.is_admin()
  );

-- SCHEDULE DATA RLS
drop policy if exists "Users manage own schedule data" on public.schedule_data;
create policy "Users manage own schedule data" on public.schedule_data
  for all using (
    auth.uid() = user_id or user_id is null or public.is_admin() or public.is_linked_parent(user_id)
  ) with check (
    auth.uid() = user_id or user_id is null or public.is_admin()
  );

-- SUBJECTS RLS
drop policy if exists "Users manage own subjects" on public.subjects;
create policy "Users manage own subjects" on public.subjects
  for all using (
    auth.uid() = user_id or public.is_admin() or public.is_linked_parent(user_id)
  ) with check (
    auth.uid() = user_id or public.is_admin()
  );

-- EDUCATION SYSTEMS / LEVELS / TRACKS / YEARS RLS (Readable by all authenticated users, writable by Admin)
drop policy if exists "Read education configs" on public.education_systems;
create policy "Read education configs" on public.education_systems for select using (auth.role() = 'authenticated');
drop policy if exists "Admin write education configs" on public.education_systems;
create policy "Admin write education configs" on public.education_systems for all using (public.is_admin());

drop policy if exists "Read academic levels" on public.academic_levels;
create policy "Read academic levels" on public.academic_levels for select using (auth.role() = 'authenticated');
drop policy if exists "Admin write academic levels" on public.academic_levels;
create policy "Admin write academic levels" on public.academic_levels for all using (public.is_admin());

drop policy if exists "Read academic tracks" on public.academic_tracks;
create policy "Read academic tracks" on public.academic_tracks for select using (auth.role() = 'authenticated');
drop policy if exists "Admin write academic tracks" on public.academic_tracks;
create policy "Admin write academic tracks" on public.academic_tracks for all using (public.is_admin());

drop policy if exists "Read academic years" on public.academic_years;
create policy "Read academic years" on public.academic_years for select using (auth.role() = 'authenticated');
drop policy if exists "Admin write academic years" on public.academic_years;
create policy "Admin write academic years" on public.academic_years for all using (public.is_admin());

-- STUDENT ACADEMIC PROFILES RLS
drop policy if exists "Manage student academic profile" on public.student_academic_profiles;
create policy "Manage student academic profile" on public.student_academic_profiles
  for all using (
    auth.uid() = student_id or public.is_admin() or public.is_linked_parent(student_id)
  ) with check (
    auth.uid() = student_id or public.is_admin()
  );

-- MASTER & FORCE CURRICULUM RLS
drop policy if exists "Read master curricula" on public.master_curricula;
create policy "Read master curricula" on public.master_curricula for select using (auth.role() = 'authenticated');
drop policy if exists "Admin write master curricula" on public.master_curricula;
create policy "Admin write master curricula" on public.master_curricula for all using (public.is_admin());

drop policy if exists "Read master subjects" on public.master_subjects;
create policy "Read master subjects" on public.master_subjects for select using (auth.role() = 'authenticated');
drop policy if exists "Admin write master subjects" on public.master_subjects;
create policy "Admin write master subjects" on public.master_subjects for all using (public.is_admin());

drop policy if exists "Read master units" on public.master_units;
create policy "Read master units" on public.master_units for select using (auth.role() = 'authenticated');
drop policy if exists "Admin write master units" on public.master_units;
create policy "Admin write master units" on public.master_units for all using (public.is_admin());

drop policy if exists "Read master lessons" on public.master_lessons;
create policy "Read master lessons" on public.master_lessons for select using (auth.role() = 'authenticated');
drop policy if exists "Admin write master lessons" on public.master_lessons;
create policy "Admin write master lessons" on public.master_lessons for all using (public.is_admin());

drop policy if exists "Read force assignments" on public.force_curriculum_assignments;
create policy "Read force assignments" on public.force_curriculum_assignments for select using (auth.role() = 'authenticated');
drop policy if exists "Admin write force assignments" on public.force_curriculum_assignments;
create policy "Admin write force assignments" on public.force_curriculum_assignments for all using (public.is_admin());

-- STUDENT REQUIRED CURRICULUM PROGRESS RLS
drop policy if exists "Manage student required progress" on public.student_required_curriculum_progress;
create policy "Manage student required progress" on public.student_required_curriculum_progress
  for all using (
    auth.uid() = student_id or public.is_admin() or public.is_linked_parent(student_id)
  ) with check (
    auth.uid() = student_id or public.is_admin()
  );

-- PARENT STUDENT RELATIONSHIPS RLS
drop policy if exists "Read parent student relationships" on public.parent_student_relationships;
create policy "Read parent student relationships" on public.parent_student_relationships
  for select using (
    auth.uid() = parent_id or auth.uid() = student_id or public.is_admin()
  );
drop policy if exists "Manage parent student relationships" on public.parent_student_relationships;
create policy "Manage parent student relationships" on public.parent_student_relationships
  for all using (
    auth.uid() = parent_id or auth.uid() = student_id or public.is_admin()
  ) with check (
    auth.uid() = parent_id or auth.uid() = student_id or public.is_admin()
  );

-- CONNECTION CODES RLS
drop policy if exists "Students manage connection codes" on public.connection_codes;
create policy "Students manage connection codes" on public.connection_codes
  for all using (
    auth.uid() = student_id or auth.role() = 'authenticated' or public.is_admin()
  ) with check (
    auth.uid() = student_id or public.is_admin()
  );

-- AUDIT LOGS RLS
drop policy if exists "Read audit logs" on public.audit_logs;
create policy "Read audit logs" on public.audit_logs for select using (public.is_admin());
drop policy if exists "Insert audit logs" on public.audit_logs;
create policy "Insert audit logs" on public.audit_logs for insert with check (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────
-- SEED DATA & MIGRATION FOR BACCALAUREATE AND OTHER SYSTEMS
-- ─────────────────────────────────────────────────────────────

do $$
declare
  sys_bac_id uuid;
  sys_sec_id uuid;
  sys_ig_id uuid;
  sys_stem_id uuid;
  sys_us_id uuid;

  lvl_bac_g3 uuid;
  lvl_sec_g2 uuid;
  lvl_ig_y11 uuid;

  trk_bac_sci uuid;
  trk_bac_math uuid;
  trk_bac_lit uuid;

  yr_2026 uuid;
begin
  -- Academic Year
  insert into public.academic_years (name, status)
  values ('2026/2027', 'ACTIVE')
  on conflict (name) do update set status = 'ACTIVE'
  returning id into yr_2026;

  -- Education Systems
  insert into public.education_systems (name, code, description)
  values ('البكالوريا - Baccalaureate', 'BAC', 'النظام التعليمي للبكالوريا المتكامل')
  on conflict (name) do update set code = 'BAC'
  returning id into sys_bac_id;

  insert into public.education_systems (name, code, description)
  values ('الثانوية العامة - General Secondary', 'SEC', 'نظام الثانوية العامة المصرية')
  on conflict (name) do update set code = 'SEC'
  returning id into sys_sec_id;

  insert into public.education_systems (name, code, description)
  values ('البريطاني - IGCSE', 'IGCSE', 'British International General Certificate of Secondary Education')
  on conflict (name) do update set code = 'IGCSE'
  returning id into sys_ig_id;

  insert into public.education_systems (name, code, description)
  values ('مدارس المتفوقين - STEM', 'STEM', 'Science, Technology, Engineering, and Mathematics Schools')
  on conflict (name) do update set code = 'STEM'
  returning id into sys_stem_id;

  insert into public.education_systems (name, code, description)
  values ('الدبلومة الأمريكية - American Diploma', 'US_DIPLOMA', 'American High School Diploma System')
  on conflict (name) do update set code = 'US_DIPLOMA'
  returning id into sys_us_id;

  -- Academic Levels for Baccalaureate
  insert into public.academic_levels (education_system_id, name, code, order_index)
  values (sys_bac_id, 'السنة الأولى - Grade 1', 'G1', 1)
  on conflict (education_system_id, code) do nothing;

  insert into public.academic_levels (education_system_id, name, code, order_index)
  values (sys_bac_id, 'السنة الثانية - Grade 2', 'G2', 2)
  on conflict (education_system_id, code) do nothing;

  insert into public.academic_levels (education_system_id, name, code, order_index)
  values (sys_bac_id, 'السنة الثالثة - Grade 3', 'G3', 3)
  on conflict (education_system_id, code) do update set name = 'السنة الثالثة - Grade 3'
  returning id into lvl_bac_g3;

  -- Academic Levels for IGCSE
  insert into public.academic_levels (education_system_id, name, code, order_index)
  values (sys_ig_id, 'Year 11', 'Y11', 11)
  on conflict (education_system_id, code) do update set name = 'Year 11'
  returning id into lvl_ig_y11;

  -- Tracks for Baccalaureate Grade 3
  if lvl_bac_g3 is not null then
    insert into public.academic_tracks (academic_level_id, name, code, order_index)
    values (lvl_bac_g3, 'شعبة العلوم - Science Track', 'SCI', 1)
    on conflict (academic_level_id, code) do update set name = 'شعبة العلوم - Science Track'
    returning id into trk_bac_sci;

    insert into public.academic_tracks (academic_level_id, name, code, order_index)
    values (lvl_bac_g3, 'شعبة الرياضيات - Mathematics Track', 'MATH', 2)
    on conflict (academic_level_id, code) do nothing;

    insert into public.academic_tracks (academic_level_id, name, code, order_index)
    values (lvl_bac_g3, 'الشعبة الأدبية - Literature Track', 'LIT', 3)
    on conflict (academic_level_id, code) do nothing;
  end if;

  -- ─────────────────────────────────────────────────────────────
  -- AUTO-MIGRATION OF EXISTING BACCALAUREATE STUDENTS
  -- ─────────────────────────────────────────────────────────────
  if sys_bac_id is not null and lvl_bac_g3 is not null and trk_bac_sci is not null and yr_2026 is not null then
    insert into public.student_academic_profiles (student_id, education_system_id, academic_level_id, track_id, academic_year_id)
    select p.id, sys_bac_id, lvl_bac_g3, trk_bac_sci, yr_2026
    from public.profiles p
    where coalesce(p.role, 'USER') = 'USER'
    on conflict (student_id) do nothing;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- AUTOMATIC PROFILE & ACADEMIC PROFILE CREATION TRIGGER
-- ─────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
declare
  sys_bac_id uuid;
  lvl_bac_g3 uuid;
  trk_bac_sci uuid;
  yr_2026 uuid;
  user_role text;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'USER');

  -- Create profile
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    user_role
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, profiles.full_name),
    phone = coalesce(excluded.phone, profiles.phone);

  -- If Student (USER), assign default Baccalaureate academic profile if not specified
  if user_role = 'USER' then
    select id into sys_bac_id from public.education_systems where code = 'BAC' limit 1;
    select id into lvl_bac_g3 from public.academic_levels where code = 'G3' limit 1;
    select id into trk_bac_sci from public.academic_tracks where code = 'SCI' limit 1;
    select id into yr_2026 from public.academic_years where status = 'ACTIVE' limit 1;

    if sys_bac_id is not null and lvl_bac_g3 is not null and yr_2026 is not null then
      insert into public.student_academic_profiles (student_id, education_system_id, academic_level_id, track_id, academic_year_id)
      values (new.id, sys_bac_id, lvl_bac_g3, trk_bac_sci, yr_2026)
      on conflict (student_id) do nothing;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

