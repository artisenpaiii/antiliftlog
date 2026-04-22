-- Add sleep tracking columns to public.days

ALTER TABLE public.days
ADD COLUMN sleep_time numeric(4,2), -- hours, allows values like 7.50
ADD COLUMN sleep_quality integer;

-- Enforce valid range for sleep_quality
ALTER TABLE public.days
ADD CONSTRAINT sleep_quality_range
CHECK (sleep_quality BETWEEN 0 AND 100);