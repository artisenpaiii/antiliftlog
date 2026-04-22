-- Add programs and blocks to the realtime publication so that
-- postgres_changes subscriptions on these tables receive events.
-- Subscriptions in AthletesView rely on this for live updates when
-- a coach creates or modifies programs/blocks on behalf of an athlete.

alter publication supabase_realtime add table public.programs;
alter publication supabase_realtime add table public.blocks;
