-- =========================================================
-- FULL RESET / DROP EVERYTHING
-- =========================================================

-- -------------------------
-- DROP POLICIES
-- -------------------------

drop policy if exists day_cells_all on public.day_cells;
drop policy if exists day_rows_all on public.day_rows;
drop policy if exists day_columns_all on public.day_columns;
drop policy if exists days_all on public.days;
drop policy if exists weeks_all on public.weeks;
drop policy if exists blocks_all on public.blocks;

drop policy if exists programs_select on public.programs;
drop policy if exists programs_insert on public.programs;
drop policy if exists programs_update on public.programs;
drop policy if exists programs_delete on public.programs;

-- -------------------------
-- DISABLE RLS
-- -------------------------

alter table if exists public.day_cells disable row level security;
alter table if exists public.day_rows disable row level security;
alter table if exists public.day_columns disable row level security;
alter table if exists public.days disable row level security;
alter table if exists public.weeks disable row level security;
alter table if exists public.blocks disable row level security;
alter table if exists public.programs disable row level security;

-- -------------------------
-- DROP TRIGGERS
-- -------------------------

drop trigger if exists trg_day_cells_updated_at on public.day_cells;
drop trigger if exists trg_day_rows_updated_at on public.day_rows;
drop trigger if exists trg_day_columns_updated_at on public.day_columns;
drop trigger if exists trg_days_updated_at on public.days;
drop trigger if exists trg_weeks_updated_at on public.weeks;
drop trigger if exists trg_blocks_updated_at on public.blocks;
drop trigger if exists trg_programs_updated_at on public.programs;

-- -------------------------
-- DROP FUNCTION
-- -------------------------

drop function if exists public.tg_set_updated_at();

-- -------------------------
-- DROP TABLES (child → parent)
-- -------------------------

drop table if exists public.day_cells cascade;
drop table if exists public.day_rows cascade;
drop table if exists public.day_columns cascade;

drop table if exists public.days cascade;
drop table if exists public.weeks cascade;
drop table if exists public.blocks cascade;
drop table if exists public.programs cascade;

-- -------------------------
-- OPTIONAL: EXTENSION
-- Only drop this if you added it just for this schema
-- -------------------------

-- drop extension if exists "pgcrypto";
