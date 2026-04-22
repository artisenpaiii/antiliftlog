-- Enable realtime and full replica identity for coach_athlete_relationships.
-- Required so DELETE events include all columns (coach_id, athlete_id)
-- and Supabase Realtime column-level filters match on DELETE.

alter table public.coach_athlete_relationships replica identity full;
