-- Replica identity full on day_rows and day_columns so that DELETE events
-- carry all columns (including block_id) and can be matched by the
-- block_id=eq.{id} Supabase Realtime filter.
alter table public.day_rows    replica identity full;
alter table public.day_columns replica identity full;
