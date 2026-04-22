-- =========================================================
-- Supabase SQL: competition (single table)
-- Ownership: auth user (created_by = auth.uid())
-- Stores: 9 attempts (squat/bench/deadlift x 3) + minimal meet metadata
-- Includes: indexes, updated_at trigger, RLS + policies
-- Requires: public.tg_set_updated_at() already exists
-- =========================================================

-- =========================
-- TABLE
-- =========================
create table if not exists public.competition (
  id uuid primary key default gen_random_uuid(),

  -- Ownership
  created_by uuid not null references auth.users(id) on delete cascade,

  -- Minimal meet metadata
  meet_name text,
  meet_date date,
  bodyweight_kg numeric(5,2),
  weight_class text,
  placing_rank integer,
  notes text,

  -- =====================
  -- Squat attempts
  -- =====================
  squat_1_kg numeric(6,2),
  squat_1_good boolean not null default false,

  squat_2_kg numeric(6,2),
  squat_2_good boolean not null default false,

  squat_3_kg numeric(6,2),
  squat_3_good boolean not null default false,

  -- =====================
  -- Bench attempts
  -- =====================
  bench_1_kg numeric(6,2),
  bench_1_good boolean not null default false,

  bench_2_kg numeric(6,2),
  bench_2_good boolean not null default false,

  bench_3_kg numeric(6,2),
  bench_3_good boolean not null default false,

  -- =====================
  -- Deadlift attempts
  -- =====================
  deadlift_1_kg numeric(6,2),
  deadlift_1_good boolean not null default false,

  deadlift_2_kg numeric(6,2),
  deadlift_2_good boolean not null default false,

  deadlift_3_kg numeric(6,2),
  deadlift_3_good boolean not null default false,

  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- =========================
-- INDEXES
-- =========================
create index if not exists idx_competition_created_by
  on public.competition(created_by);

create index if not exists idx_competition_meet_date
  on public.competition(meet_date);

create index if not exists idx_competition_created_at
  on public.competition(created_at);

-- =========================
-- updated_at TRIGGER
-- =========================
drop trigger if exists trg_competition_updated_at
on public.competition;

create trigger trg_competition_updated_at
before update on public.competition
for each row execute function public.tg_set_updated_at();

-- =========================
-- RLS
-- =========================
alter table public.competition enable row level security;

-- =========================
-- POLICIES
-- =========================
drop policy if exists competition_select
on public.competition;
create policy competition_select
on public.competition
for select
using (created_by = auth.uid());

drop policy if exists competition_insert
on public.competition;
create policy competition_insert
on public.competition
for insert
with check (created_by = auth.uid());

drop policy if exists competition_update
on public.competition;
create policy competition_update
on public.competition
for update
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists competition_delete
on public.competition;
create policy competition_delete
on public.competition
for delete
using (created_by = auth.uid());
