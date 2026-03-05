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

export type LiftType = "squat" | "bench" | "deadlift";
