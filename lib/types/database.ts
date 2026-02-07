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
  created_at: string;
  updated_at: string;
}

export interface DayCell {
  id: string;
  day_row_id: string;
  day_column_id: string;
  value: string | null;
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

export type DayCellInsert = Omit<DayCell, "id" | "created_at" | "updated_at">;

// Update types (all fields optional except id)

export type ProgramUpdate = Partial<Omit<Program, "id" | "created_by" | "created_at" | "updated_at">>;

export type BlockUpdate = Partial<Omit<Block, "id" | "created_at" | "updated_at">>;

export type WeekUpdate = Partial<Omit<Week, "id" | "created_at" | "updated_at">>;

export type DayUpdate = Partial<Omit<Day, "id" | "created_at" | "updated_at">>;

export type DayColumnUpdate = Partial<Omit<DayColumn, "id" | "created_at" | "updated_at">>;

export type DayRowUpdate = Partial<Omit<DayRow, "id" | "created_at" | "updated_at">>;

export type DayCellUpdate = Partial<Omit<DayCell, "id" | "created_at" | "updated_at">>;
