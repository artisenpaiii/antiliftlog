import type { Block, Week, Day, DayColumn, DayRow } from "@/lib/types/database";

export interface ProgramHierarchy {
  blocks: Array<{
    block: Block;
    weeks: Array<{
      week: Week;
      days: Array<{
        day: Day;
        columns: DayColumn[];
        rows: DayRow[];
      }>;
    }>;
  }>;
}

export interface WeekDataPoint {
  label: string;
  [exerciseName: string]: number | string;
}

/** The three competition lifts */
export type MainLift = "squat" | "bench" | "deadlift";

/** Backward-compatible alias */
export type LiftType = MainLift;

/** Short tags for main lift categories */
export type MainLiftTag = "s" | "bp" | "d";

/** Variant tag for a specific exercise variation */
export type VariantTag = string;

/** Classification result from LiftParser */
export interface LiftClassification {
  mainLift: MainLift;
  mainTag: MainLiftTag;
  variantTags: VariantTag[];
}

/** A single parsed training row — the core data unit for all charts */
export interface ParsedLiftRecord {
  classification: LiftClassification;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number;
  rpe: number;
  plannedRpe: number;
  blockOrder: number;
  blockStartDate: string | null;
  weekNumber: number;
  dayNumber: number;
  weekDayIndex: number | null;
  sleepQuality: number | null;
  sleepTime: number | null;
}
