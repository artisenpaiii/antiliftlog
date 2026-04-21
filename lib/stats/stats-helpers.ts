import { WEEKDAY_SHORT_LABELS } from "@/lib/types/database";
import type { ParsedLiftRecord, LiftType } from "./types";

export interface UserPRs {
  squat: number | null;
  bench: number | null;
  deadlift: number | null;
}

export const LIFT_MULTIPLIERS: Record<LiftType, number> = {
  bench: 1.0,
  squat: 1.3,
  deadlift: 1.6,
};

export const BASE_DECAY = 0.7;

export function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.,-]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseRpe(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.,-]/g, "").replace(",", ".");
  const parts = cleaned.split("-").filter((p) => p !== "");
  if (parts.length >= 2) {
    const upper = parseFloat(parts[parts.length - 1]);
    return isNaN(upper) ? 0 : upper;
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function buildDayIndex(records: ParsedLiftRecord[]): Map<string, ParsedLiftRecord[]> {
  const index = new Map<string, ParsedLiftRecord[]>();
  for (const record of records) {
    const key = `${record.blockOrder}-${record.weekNumber}-${record.dayNumber}`;
    const existing = index.get(key);
    if (existing) {
      existing.push(record);
    } else {
      index.set(key, [record]);
    }
  }
  return index;
}

export function makeDayLabel(
  blockStartDate: string | null,
  blockOrder: number,
  weekNumber: number,
  dayNumber: number,
  weekDayIndex: number | null,
): string {
  if (blockStartDate && weekDayIndex !== null) {
    const start = new Date(blockStartDate + "T00:00:00");
    const dayOffset = (weekNumber - 1) * 7 + weekDayIndex;
    const date = new Date(start);
    date.setDate(start.getDate() + dayOffset);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (weekDayIndex !== null) {
    return `${WEEKDAY_SHORT_LABELS[weekDayIndex]} B${blockOrder + 1}W${weekNumber}`;
  }
  return `B${blockOrder + 1}W${weekNumber}D${dayNumber}`;
}

export function makeWeekLabel(blockStartDate: string | null, blockOrder: number, weekNumber: number): string {
  if (blockStartDate) {
    const start = new Date(blockStartDate + "T00:00:00");
    const weekOffset = (weekNumber - 1) * 7;
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + weekOffset);
    return weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return `B${blockOrder + 1}W${weekNumber}`;
}
