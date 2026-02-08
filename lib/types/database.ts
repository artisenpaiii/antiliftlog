export type DbResult<T> = { data: T | null; error: string | null };

// Database row types derived from the SQL schema in lib/SQL

export interface Program {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Block {
  id: string;
  program_id: string;
  name: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Week {
  id: string;
  block_id: string;
  week_number: number;
  created_at: string;
  updated_at: string;
}

export interface Day {
  id: string;
  week_id: string;
  day_number: number;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface DayColumn {
  id: string;
  day_id: string;
  label: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface DayRow {
  id: string;
  day_id: string;
  order: number;
  cells: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface Competition {
  id: string;
  created_by: string;
  meet_name: string;
  meet_date: string;
  weight_class: string | null;
  bodyweight_kg: number | null;
  squat_1_kg: number | null;
  squat_1_good: boolean | null;
  squat_2_kg: number | null;
  squat_2_good: boolean | null;
  squat_3_kg: number | null;
  squat_3_good: boolean | null;
  bench_1_kg: number | null;
  bench_1_good: boolean | null;
  bench_2_kg: number | null;
  bench_2_good: boolean | null;
  bench_3_kg: number | null;
  bench_3_good: boolean | null;
  deadlift_1_kg: number | null;
  deadlift_1_good: boolean | null;
  deadlift_2_kg: number | null;
  deadlift_2_good: boolean | null;
  deadlift_3_kg: number | null;
  deadlift_3_good: boolean | null;
  placing_rank: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Insert types (omit server-generated fields)

export type ProgramInsert = Omit<Program, "id" | "created_at" | "updated_at">;

export type BlockInsert = Omit<Block, "id" | "created_at" | "updated_at">;

export type WeekInsert = Omit<Week, "id" | "created_at" | "updated_at">;

export type DayInsert = Omit<Day, "id" | "created_at" | "updated_at">;

export type DayColumnInsert = Omit<DayColumn, "id" | "created_at" | "updated_at">;

export type DayRowInsert = Omit<DayRow, "id" | "created_at" | "updated_at">;

export type CompetitionInsert = Omit<Competition, "id" | "created_at" | "updated_at">;

// Update types (all fields optional except id)

export type ProgramUpdate = Partial<Omit<Program, "id" | "created_by" | "created_at" | "updated_at">>;

export type BlockUpdate = Partial<Omit<Block, "id" | "created_at" | "updated_at">>;

export type WeekUpdate = Partial<Omit<Week, "id" | "created_at" | "updated_at">>;

export type DayUpdate = Partial<Omit<Day, "id" | "created_at" | "updated_at">>;

export type DayColumnUpdate = Partial<Omit<DayColumn, "id" | "created_at" | "updated_at">>;

export type DayRowUpdate = Partial<Omit<DayRow, "id" | "created_at" | "updated_at">>;

export type CompetitionUpdate = Partial<Omit<Competition, "id" | "created_by" | "created_at" | "updated_at">>;

export interface StatsSettings {
  id: string;
  program_id: string;
  created_by: string;
  exercise_label: string;
  sets_label: string;
  reps_label: string;
  weight_label: string;
  created_at: string;
  updated_at: string;
}

export type StatsSettingsInsert = Omit<StatsSettings, "id" | "created_at" | "updated_at">;

export type StatsSettingsUpdate = Partial<Omit<StatsSettings, "id" | "created_by" | "created_at" | "updated_at">>;

export interface UserMetadata {
  display_name: string;
  pb_squat_gym: number | null;
  pb_bench_gym: number | null;
  pb_deadlift_gym: number | null;
  pb_squat_comp: number | null;
  pb_bench_comp: number | null;
  pb_deadlift_comp: number | null;
}
