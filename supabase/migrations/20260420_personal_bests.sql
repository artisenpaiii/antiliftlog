-- Personal bests history table
-- One row per lift per entry. Multiple gym entries allowed (history).
-- Competition entries are unique per (created_by, lift, competition_id).

create table personal_bests (
  id            uuid primary key default gen_random_uuid(),
  created_by    uuid references auth.users not null,
  lift          text not null check (lift in ('squat', 'bench', 'deadlift')),
  kg            numeric not null,
  source        text not null check (source in ('gym', 'competition')),
  recorded_at   date not null,
  competition_id uuid references competition(id) on delete set null,
  created_at    timestamptz default now()
);

-- Prevent duplicate competition PB entries per lift per meet
create unique index personal_bests_comp_unique
  on personal_bests (created_by, lift, competition_id)
  where competition_id is not null;

-- RLS
alter table personal_bests enable row level security;

create policy "select own"
  on personal_bests for select
  using (auth.uid() = created_by);

create policy "insert own"
  on personal_bests for insert
  with check (auth.uid() = created_by);

create policy "update own"
  on personal_bests for update
  using (auth.uid() = created_by);

create policy "delete own"
  on personal_bests for delete
  using (auth.uid() = created_by);
