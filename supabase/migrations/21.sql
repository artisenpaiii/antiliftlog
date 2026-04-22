-- Allow coaches to create, update, and delete programs on behalf of their athletes.
-- Migration 15 added programs_select for coaches (read-only).
-- Blocks, weeks, days, day_rows, day_columns already allow coach writes via their
-- _all policies in migrations 15 and 19 (both using and with check include is_accepted_coach_of).

create policy programs_insert_coach
  on public.programs for insert
  with check (is_accepted_coach_of(created_by));

create policy programs_update_coach
  on public.programs for update
  using (is_accepted_coach_of(created_by))
  with check (is_accepted_coach_of(created_by));

create policy programs_delete_coach
  on public.programs for delete
  using (is_accepted_coach_of(created_by));
