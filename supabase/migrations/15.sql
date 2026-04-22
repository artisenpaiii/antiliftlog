-- =========================================================
-- Coach-Athlete Relationships
-- =========================================================

-- -------------------------
-- TABLE
-- -------------------------

create table public.coach_athlete_relationships (
  id             uuid primary key default gen_random_uuid(),
  coach_id       uuid not null references auth.users(id) on delete cascade,
  athlete_id     uuid not null references auth.users(id) on delete cascade,
  status         text not null default 'pending'
                   check (status in ('pending', 'accepted', 'declined')),
  initiator_role text not null
                   check (initiator_role in ('coach', 'athlete')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint car_unique unique (coach_id, athlete_id)
);

create index idx_car_coach_id    on public.coach_athlete_relationships(coach_id);
create index idx_car_athlete_id  on public.coach_athlete_relationships(athlete_id);
create index idx_car_status      on public.coach_athlete_relationships(status);

drop trigger if exists trg_car_updated_at on public.coach_athlete_relationships;
create trigger trg_car_updated_at
before update on public.coach_athlete_relationships
for each row execute function public.tg_set_updated_at();

-- -------------------------
-- RLS on coach_athlete_relationships
-- -------------------------

alter table public.coach_athlete_relationships enable row level security;

create policy car_select
  on public.coach_athlete_relationships for select
  using (coach_id = auth.uid() or athlete_id = auth.uid());

-- Coach initiates: coach_id must match auth.uid() and initiator_role = 'coach'
-- Athlete initiates: athlete_id must match auth.uid() and initiator_role = 'athlete'
create policy car_insert
  on public.coach_athlete_relationships for insert
  with check (
    (initiator_role = 'coach'   and coach_id   = auth.uid()) or
    (initiator_role = 'athlete' and athlete_id  = auth.uid())
  );

-- Only the recipient may change status; either party may decline
create policy car_update
  on public.coach_athlete_relationships for update
  using (coach_id = auth.uid() or athlete_id = auth.uid())
  with check (coach_id = auth.uid() or athlete_id = auth.uid());

create policy car_delete
  on public.coach_athlete_relationships for delete
  using (coach_id = auth.uid() or athlete_id = auth.uid());

-- -------------------------
-- HELPER FUNCTION
-- -------------------------

create or replace function public.is_accepted_coach_of(athlete_user_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.coach_athlete_relationships
    where coach_id = auth.uid()
      and athlete_id = athlete_user_id
      and status = 'accepted'
  )
$$;

-- -------------------------
-- USER LOOKUP RPCs
-- -------------------------

create or replace function public.find_user_by_email(lookup_email text)
returns table(id uuid, display_name text)
language sql security definer stable as $$
  select
    u.id,
    coalesce(u.raw_user_meta_data->>'display_name', '') as display_name
  from auth.users u
  where u.email = lookup_email
  limit 1;
$$;

create or replace function public.get_user_profiles(user_ids uuid[])
returns table(id uuid, email text, display_name text)
language sql security definer stable as $$
  select
    u.id,
    u.email,
    coalesce(u.raw_user_meta_data->>'display_name', '') as display_name
  from auth.users u
  where u.id = any(user_ids);
$$;

-- -------------------------
-- EXTEND RLS: programs (SELECT only)
-- -------------------------

drop policy if exists programs_select on public.programs;
create policy programs_select
  on public.programs for select
  using (
    created_by = auth.uid()
    or is_accepted_coach_of(created_by)
  );

-- -------------------------
-- EXTEND RLS: blocks
-- -------------------------

drop policy if exists blocks_all on public.blocks;
create policy blocks_all
  on public.blocks for all
  using (
    exists (
      select 1 from public.programs p
      where p.id = blocks.program_id
        and (p.created_by = auth.uid() or is_accepted_coach_of(p.created_by))
    )
  )
  with check (
    exists (
      select 1 from public.programs p
      where p.id = blocks.program_id
        and (p.created_by = auth.uid() or is_accepted_coach_of(p.created_by))
    )
  );

-- -------------------------
-- EXTEND RLS: weeks
-- -------------------------

drop policy if exists weeks_all on public.weeks;
create policy weeks_all
  on public.weeks for all
  using (
    exists (
      select 1
      from public.blocks b
      join public.programs p on p.id = b.program_id
      where b.id = weeks.block_id
        and (p.created_by = auth.uid() or is_accepted_coach_of(p.created_by))
    )
  )
  with check (
    exists (
      select 1
      from public.blocks b
      join public.programs p on p.id = b.program_id
      where b.id = weeks.block_id
        and (p.created_by = auth.uid() or is_accepted_coach_of(p.created_by))
    )
  );

-- -------------------------
-- EXTEND RLS: days
-- -------------------------

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
        and (p.created_by = auth.uid() or is_accepted_coach_of(p.created_by))
    )
  )
  with check (
    exists (
      select 1
      from public.weeks w
      join public.blocks b on b.id = w.block_id
      join public.programs p on p.id = b.program_id
      where w.id = days.week_id
        and (p.created_by = auth.uid() or is_accepted_coach_of(p.created_by))
    )
  );

-- -------------------------
-- EXTEND RLS: day_columns
-- -------------------------

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
        and (p.created_by = auth.uid() or is_accepted_coach_of(p.created_by))
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
        and (p.created_by = auth.uid() or is_accepted_coach_of(p.created_by))
    )
  );

-- -------------------------
-- EXTEND RLS: day_rows
-- -------------------------

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
        and (p.created_by = auth.uid() or is_accepted_coach_of(p.created_by))
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
        and (p.created_by = auth.uid() or is_accepted_coach_of(p.created_by))
    )
  );

-- -------------------------
-- REALTIME
-- -------------------------

alter publication supabase_realtime add table public.day_rows;
alter publication supabase_realtime add table public.day_columns;
alter publication supabase_realtime add table public.coach_athlete_relationships;

-- Full replica identity so DELETE events carry all columns for filter matching
alter table public.coach_athlete_relationships replica identity full;
