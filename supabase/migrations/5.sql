-- Make sure meet_name + meet_date are required.
-- (created_by is already NOT NULL in your current table)

alter table public.competition
  alter column meet_name set not null,
  alter column meet_date set not null;

-- Everything else is already nullable by default.
-- If any of these were previously set NOT NULL, this will relax them:

alter table public.competition
  alter column bodyweight_kg drop not null,
  alter column weight_class drop not null,
  alter column placing_rank drop not null,
  alter column notes drop not null,

  alter column squat_1_kg drop not null,
  alter column squat_2_kg drop not null,
  alter column squat_3_kg drop not null,

  alter column bench_1_kg drop not null,
  alter column bench_2_kg drop not null,
  alter column bench_3_kg drop not null,

  alter column deadlift_1_kg drop not null,
  alter column deadlift_2_kg drop not null,
  alter column deadlift_3_kg drop not null,

  alter column squat_1_good drop not null,
  alter column squat_2_good drop not null,
  alter column squat_3_good drop not null,

  alter column bench_1_good drop not null,
  alter column bench_2_good drop not null,
  alter column bench_3_good drop not null,

  alter column deadlift_1_good drop not null,
  alter column deadlift_2_good drop not null,
  alter column deadlift_3_good drop not null;
