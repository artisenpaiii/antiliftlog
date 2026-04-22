-- =========================================================
-- Migration + RLS refresh: day_cells -> day_rows.cells (jsonb)
-- Uses jsonb_each() for sanity checks (no jsonb_object_length dependency)
-- =========================================================

begin;

set local lock_timeout = '10s';
set local statement_timeout = '10min';

-- Lock to prevent mid-migration writes
lock table public.programs    in share row exclusive mode;
lock table public.blocks      in share row exclusive mode;
lock table public.weeks       in share row exclusive mode;
lock table public.days        in share row exclusive mode;
lock table public.day_columns in share row exclusive mode;
lock table public.day_rows    in share row exclusive mode;
lock table public.day_cells   in share row exclusive mode;

-- =========================================================
-- 1) updated_at trigger function + triggers (idempotent)
-- =========================================================
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

-- day_cells trigger will be dropped with the table, no need to touch it here.

-- =========================================================
-- 2) Alter day_rows: add jsonb blob
-- =========================================================
alter table public.day_rows
add column if not exists cells jsonb not null default '{}'::jsonb;

-- =========================================================
-- 3) Migrate existing values
--    Only non-null values are migrated to keep blobs smaller/cleaner
-- =========================================================
create temp table _migrate_counts as
select
  (select count(*) from public.day_cells) as old_total_cells,
  (select count(*) from public.day_cells where value is not null) as old_nonnull_cells;

with agg as (
  select
    dc.day_row_id,
    jsonb_object_agg(dc.day_column_id::text, to_jsonb(dc.value)) as cells_json
  from public.day_cells dc
  where dc.value is not null
  group by dc.day_row_id
)
update public.day_rows r
set cells = agg.cells_json
from agg
where r.id = agg.day_row_id;

-- =========================================================
-- 4) Sanity checks (rollback on mismatch)
--    - new_key_count = total keys across all cells blobs
--    - must equal old_nonnull_cells
-- =========================================================
do $$
declare
  old_nonnull bigint;
  new_key_count bigint;
  null_cells_rows bigint;
begin
  select old_nonnull_cells into old_nonnull from _migrate_counts;

  -- Count total keys across all row blobs without jsonb_object_length()
  select coalesce(count(*), 0)
    into new_key_count
  from public.day_rows r
  cross join lateral jsonb_each(r.cells);

  select count(*)
    into null_cells_rows
  from public.day_rows
  where cells is null;

  if null_cells_rows <> 0 then
    raise exception
      'Migration failed: found % day_rows rows with NULL cells. Rolling back.',
      null_cells_rows;
  end if;

  if new_key_count <> old_nonnull then
    raise exception
      'Migration failed: expected % migrated non-null cells, but found % keys in day_rows.cells. Rolling back.',
      old_nonnull, new_key_count;
  end if;
end $$;

-- =========================================================
-- 5) Drop day_cells policies + table
-- =========================================================
drop policy if exists day_cells_all on public.day_cells;
drop policy if exists day_cells_select on public.day_cells;
drop policy if exists day_cells_insert on public.day_cells;
drop policy if exists day_cells_update on public.day_cells;
drop policy if exists day_cells_delete on public.day_cells;

drop table if exists public.day_cells;

-- =========================================================
-- 6) RLS enable (idempotent)
-- =========================================================
alter table public.programs    enable row level security;
alter table public.blocks      enable row level security;
alter table public.weeks       enable row level security;
alter table public.days        enable row level security;
alter table public.day_columns enable row level security;
alter table public.day_rows    enable row level security;

-- =========================================================
-- 7) Policies (same ownership chain, just no day_cells)
-- =========================================================

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

-- blocks
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

-- day_rows (now includes jsonb cells, policy stays the same)
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

commit;

-- =========================================================
-- After migration: exact cell operations
-- =========================================================
-- Set cell:
-- update public.day_rows
-- set cells = jsonb_set(cells, array[$2::text], to_jsonb($3::text), true)
-- where id = $1;
--
-- Clear cell:
-- update public.day_rows
-- set cells = cells - $2::text
-- where id = $1;
--
-- Optional cleanup when deleting a column (remove key from all row blobs):
-- update public.day_rows
-- set cells = cells - $2::text
-- where day_id = $1;
