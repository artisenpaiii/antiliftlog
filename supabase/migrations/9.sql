ALTER TABLE public.days ADD COLUMN week_day_index integer;
ALTER TABLE public.days ADD CONSTRAINT week_day_index_range CHECK (week_day_index BETWEEN 0 AND 6);
