-- Reduce RLS policy join depth for day_rows and day_columns.
-- Both tables already carry block_id, so we can jump directly to
-- blocks → programs (2 joins) instead of days → weeks → blocks → programs (4 joins).
-- This eliminates the main source of high realtime event latency.

drop policy if exists day_rows_all on public.day_rows;
create policy day_rows_all
  on public.day_rows for all
  using (
    exists (
      select 1
      from public.blocks b
      join public.programs p on p.id = b.program_id
      where b.id = day_rows.block_id
        and (p.created_by = auth.uid() or is_accepted_coach_of(p.created_by))
    )
  )
  with check (
    exists (
      select 1
      from public.blocks b
      join public.programs p on p.id = b.program_id
      where b.id = day_rows.block_id
        and (p.created_by = auth.uid() or is_accepted_coach_of(p.created_by))
    )
  );

drop policy if exists day_columns_all on public.day_columns;
create policy day_columns_all
  on public.day_columns for all
  using (
    exists (
      select 1
      from public.blocks b
      join public.programs p on p.id = b.program_id
      where b.id = day_columns.block_id
        and (p.created_by = auth.uid() or is_accepted_coach_of(p.created_by))
    )
  )
  with check (
    exists (
      select 1
      from public.blocks b
      join public.programs p on p.id = b.program_id
      where b.id = day_columns.block_id
        and (p.created_by = auth.uid() or is_accepted_coach_of(p.created_by))
    )
  );

-- Composite index so the coach-lookup inside is_accepted_coach_of() hits a single index scan.
create index if not exists idx_car_coach_athlete_status
  on public.coach_athlete_relationships (coach_id, athlete_id, status);
