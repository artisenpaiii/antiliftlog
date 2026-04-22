-- Add weeks and days to the realtime publication.
-- Only day_rows, day_columns, and coach_athlete_relationships were added in
-- migration 15. A missing-publication error on any subscription in a channel
-- kills event delivery for all other subscriptions in that same channel.

alter publication supabase_realtime add table public.weeks;
alter publication supabase_realtime add table public.days;
