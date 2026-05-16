-- Add `hidden` flag to days so coaches can hide training days from athletes.
-- Coaches still see hidden days (with an indicator); athletes do not.

alter table public.days
add column hidden boolean not null default false;
