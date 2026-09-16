-- ─────────────────────────────────────────────────────────────
-- BACCALAUREATE STUDY PLANNER - SUPABASE DATABASE SCHEMA
-- Phase 1: Foundation, User Isolation & Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  language text default 'en',
  role text default 'USER', -- 'USER' or 'ADMIN'
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

-- ─────────────────────────────────────────────────────────────
-- HELPER FUNCTION FOR ADMIN ROLE VERIFICATION
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  );
end;
$$ language plpgsql security definer;

-- ─────────────────────────────────────────────────────────────
-- ENABLE ROW LEVEL SECURITY (RLS) FOR USER & ADMIN ACCESS
-- ─────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.schedule_columns enable row level security;
alter table public.schedule_sessions enable row level security;
alter table public.weekly_data enable row level security;
alter table public.user_meta enable row level security;
alter table public.schedule_data enable row level security;

-- PROFILES RLS
drop policy if exists "Users read write own profile" on public.profiles;
create policy "Users read write own profile" on public.profiles
  for all using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

-- SCHEDULE COLUMNS RLS
drop policy if exists "Users manage own columns" on public.schedule_columns;
create policy "Users manage own columns" on public.schedule_columns
  for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

-- SCHEDULE SESSIONS RLS
drop policy if exists "Users manage own sessions" on public.schedule_sessions;
create policy "Users manage own sessions" on public.schedule_sessions
  for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

-- WEEKLY DATA RLS
drop policy if exists "Users manage own weekly data" on public.weekly_data;
create policy "Users manage own weekly data" on public.weekly_data
  for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

-- USER META RLS
drop policy if exists "Users manage own meta" on public.user_meta;
create policy "Users manage own meta" on public.user_meta
  for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

-- SCHEDULE DATA RLS
drop policy if exists "Users manage own schedule data" on public.schedule_data;
create policy "Users manage own schedule data" on public.schedule_data
  for all using (auth.uid() = user_id or user_id is null or public.is_admin()) with check (auth.uid() = user_id or user_id is null or public.is_admin());

-- 7. SUBJECTS TABLE (Curriculum & subject metrics)
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

alter table public.subjects enable row level security;
drop policy if exists "Users manage own subjects" on public.subjects;
create policy "Users manage own subjects" on public.subjects
  for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

-- INDEXES FOR PERFORMANCE
create index if not exists idx_sessions_user_day on public.schedule_sessions (user_id, day_name);
create index if not exists idx_weekly_user_week on public.weekly_data (user_id, week_key);
create index if not exists idx_subjects_user on public.subjects (user_id);

-- 8. AUTOMATIC PROFILE CREATION TRIGGER
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

