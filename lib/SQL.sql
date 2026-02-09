-- =========================================================
-- Supabase init SQL (updated exactly as requested)
-- - programs/blocks/weeks/days
-- - dynamic grid: day_columns, day_rows, day_cells
-- Changes from earlier drafts:
--   * days: removed notes
--   * day_columns: ONLY (day_id, label, order, timestamps)  -- no key/data_type/config
--   * day_rows: ONLY (day_id, order, timestamps)           -- no label/metadata
--   * day_cells: ONLY (day_row_id, day_column_id, value, timestamps) -- no value_json
-- Includes: indexes, updated_at triggers, RLS + policies
-- Ownership: programs.created_by = auth.uid()
-- =========================================================

create extension if not exists "pgcrypto";

-- =========================
-- TABLES
-- =========================

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  created_by uuid not null references auth.users(id),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id),
  name varchar not null,
  "order" integer not null default 0,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists public.weeks (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.blocks(id),
  week_number integer not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists public.days (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id),
  day_number integer not null,
  name varchar,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- Dynamic columns for a day
create table if not exists public.day_columns (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days(id) on delete cascade,
  label varchar not null,
  "order" integer not null default 0,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- Dynamic rows for a day
create table if not exists public.day_rows (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days(id) on delete cascade,
  "order" integer not null default 0,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- Cells: store everything as string
create table if not exists public.day_cells (
  id uuid primary key default gen_random_uuid(),
  day_row_id uuid not null references public.day_rows(id) on delete cascade,
  day_column_id uuid not null references public.day_columns(id) on delete cascade,
  value text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  constraint day_cells_unique_row_col unique (day_row_id, day_column_id)
);

-- =========================
-- INDEXES
-- =========================

create index if not exists idx_programs_created_by
  on public.programs(created_by);

create index if not exists idx_blocks_program_id
  on public.blocks(program_id);

create index if not exists idx_blocks_program_order
  on public.blocks(program_id, "order");

create index if not exists idx_weeks_block_id
  on public.weeks(block_id);

create index if not exists idx_weeks_block_week_number
  on public.weeks(block_id, week_number);

create index if not exists idx_days_week_id
  on public.days(week_id);

create index if not exists idx_days_week_day_number
  on public.days(week_id, day_number);

create index if not exists idx_day_columns_day_id
  on public.day_columns(day_id);

create index if not exists idx_day_columns_day_order
  on public.day_columns(day_id, "order");

create index if not exists idx_day_rows_day_id
  on public.day_rows(day_id);

create index if not exists idx_day_rows_day_order
  on public.day_rows(day_id, "order");

create index if not exists idx_day_cells_row_id
  on public.day_cells(day_row_id);

create index if not exists idx_day_cells_column_id
  on public.day_cells(day_column_id);

-- =========================
-- updated_at TRIGGERS
-- =========================

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_programs_updated_at on public.programs;
create trigger trg_programs_updated_at
before update on public.programs
for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_blocks_updated_at on public.blocks;
create trigger trg_blocks_updated_at
before update on public.blocks
for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_weeks_updated_at on public.weeks;
create trigger trg_weeks_updated_at
before update on public.weeks
for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_days_updated_at on public.days;
create trigger trg_days_updated_at
before update on public.days
for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_day_columns_updated_at on public.day_columns;
create trigger trg_day_columns_updated_at
before update on public.day_columns
for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_day_rows_updated_at on public.day_rows;
create trigger trg_day_rows_updated_at
before update on public.day_rows
for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_day_cells_updated_at on public.day_cells;
create trigger trg_day_cells_updated_at
before update on public.day_cells
for each row execute function public.tg_set_updated_at();

-- =========================
-- RLS
-- =========================

alter table public.programs enable row level security;
alter table public.blocks enable row level security;
alter table public.weeks enable row level security;
alter table public.days enable row level security;
alter table public.day_columns enable row level security;
alter table public.day_rows enable row level security;
alter table public.day_cells enable row level security;

-- =========================
-- POLICIES
-- Ownership chain:
-- programs(created_by) -> blocks -> weeks -> days -> (day_rows/day_columns) -> day_cells
-- =========================

-- programs
drop policy if exists programs_select on public.programs;
create policy programs_select
on public.programs for select
using (created_by = auth.uid());

drop policy if exists programs_insert on public.programs;
create policy programs_insert
on public.programs for insert
with check (created_by = auth.uid());

drop policy if exists programs_update on public.programs;
create policy programs_update
on public.programs for update
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists programs_delete on public.programs;
create policy programs_delete
on public.programs for delete
using (created_by = auth.uid());

-- blocks (single ALL policy)
drop policy if exists blocks_all on public.blocks;
create policy blocks_all
on public.blocks for all
using (
  exists (
    select 1 from public.programs p
    where p.id = blocks.program_id
      and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.programs p
    where p.id = blocks.program_id
      and p.created_by = auth.uid()
  )
);

-- weeks
drop policy if exists weeks_all on public.weeks;
create policy weeks_all
on public.weeks for all
using (
  exists (
    select 1
    from public.blocks b
    join public.programs p on p.id = b.program_id
    where b.id = weeks.block_id
      and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.blocks b
    join public.programs p on p.id = b.program_id
    where b.id = weeks.block_id
      and p.created_by = auth.uid()
  )
);

-- days
drop policy if exists days_all on public.days;
create policy days_all
on public.days for all
using (
  exists (
    select 1
    from public.weeks w
    join public.blocks b on b.id = w.block_id
    join public.programs p on p.id = b.program_id
    where w.id = days.week_id
      and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.weeks w
    join public.blocks b on b.id = w.block_id
    join public.programs p on p.id = b.program_id
    where w.id = days.week_id
      and p.created_by = auth.uid()
  )
);

-- day_columns
drop policy if exists day_columns_all on public.day_columns;
create policy day_columns_all
on public.day_columns for all
using (
  exists (
    select 1
    from public.days d
    join public.weeks w on w.id = d.week_id
    join public.blocks b on b.id = w.block_id
    join public.programs p on p.id = b.program_id
    where d.id = day_columns.day_id
      and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.days d
    join public.weeks w on w.id = d.week_id
    join public.blocks b on b.id = w.block_id
    join public.programs p on p.id = b.program_id
    where d.id = day_columns.day_id
      and p.created_by = auth.uid()
  )
);

-- day_rows
drop policy if exists day_rows_all on public.day_rows;
create policy day_rows_all
on public.day_rows for all
using (
  exists (
    select 1
    from public.days d
    join public.weeks w on w.id = d.week_id
    join public.blocks b on b.id = w.block_id
    join public.programs p on p.id = b.program_id
    where d.id = day_rows.day_id
      and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.days d
    join public.weeks w on w.id = d.week_id
    join public.blocks b on b.id = w.block_id
    join public.programs p on p.id = b.program_id
    where d.id = day_rows.day_id
      and p.created_by = auth.uid()
  )
);

-- =========================
-- MIGRATION: Add sleep tracking to days
-- =========================

ALTER TABLE public.days
ADD COLUMN sleep_time numeric(4,2),
ADD COLUMN sleep_quality integer;

ALTER TABLE public.days
ADD CONSTRAINT sleep_quality_range
CHECK (sleep_quality BETWEEN 0 AND 100);

-- day_cells
drop policy if exists day_cells_all on public.day_cells;
create policy day_cells_all
on public.day_cells for all
using (
  exists (
    select 1
    from public.day_rows r
    join public.days d on d.id = r.day_id
    join public.weeks w on w.id = d.week_id
    join public.blocks b on b.id = w.block_id
    join public.programs p on p.id = b.program_id
    where r.id = day_cells.day_row_id
      and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.day_rows r
    join public.days d on d.id = r.day_id
    join public.weeks w on w.id = d.week_id
    join public.blocks b on b.id = w.block_id
    join public.programs p on p.id = b.program_id
    where r.id = day_cells.day_row_id
      and p.created_by = auth.uid()
  )
  and exists (
    select 1
    from public.day_columns c
    join public.days d on d.id = c.day_id
    join public.weeks w on w.id = d.week_id
    join public.blocks b on b.id = w.block_id
    join public.programs p on p.id = b.program_id
    where c.id = day_cells.day_column_id
      and p.created_by = auth.uid()
  )
);

-- =========================
-- MIGRATION: Add rpe_label to stats_settings
-- =========================

ALTER TABLE public.stats_settings ADD COLUMN rpe_label varchar;
