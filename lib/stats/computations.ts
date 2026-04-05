import type { FatigueDataPoint } from "@/components/fatigue-chart";
import { WEEKDAY_SHORT_LABELS } from "@/lib/types/database";
import type { ProgramHierarchy, WeekDataPoint, LiftType, ParsedLiftRecord } from "./types";

export interface UserPRs {
  squat: number | null;
  bench: number | null;
  deadlift: number | null;
}

export interface IntensityZonePoint {
  label: string;
  zone1: number; // < 70% 1RM — technique / GPP
  zone2: number; // 70–80% — volume / hypertrophy
  zone3: number; // 80–90% — primary strength
  zone4: number; // > 90% — neural / peaking
}

export interface WeeklyLiftSummary {
  sets: number;
  totalReps: number;
  avgRpe: number | null;
  peakWeight: number | null;
  volume: number; // sets × reps × weight
  avgIntensityPct: number | null;
}

export interface WeeklyLoadRow {
  label: string;
  squat: WeeklyLiftSummary;
  bench: WeeklyLiftSummary;
  deadlift: WeeklyLiftSummary;
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

/** Build a lookup from day coordinates to parsed records */
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

/** Generate a day label from hierarchy metadata */
function makeDayLabel(
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

/** Generate a week label from hierarchy metadata */
function makeWeekLabel(blockStartDate: string | null, blockOrder: number, weekNumber: number): string {
  if (blockStartDate) {
    const start = new Date(blockStartDate + "T00:00:00");
    const weekOffset = (weekNumber - 1) * 7;
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + weekOffset);
    return weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return `B${blockOrder + 1}W${weekNumber}`;
}

// ==================== Chart Computations ====================

export function computeFatigueData(
  records: ParsedLiftRecord[],
  hierarchy: ProgramHierarchy,
  sleepAdjustmentEnabled: boolean,
): { dataPoints: FatigueDataPoint[]; liftTypes: LiftType[] } {
  const dataPoints: FatigueDataPoint[] = [];
  const activeLiftTypes = new Set<LiftType>();
  const dayIndex = buildDayIndex(records);

  const sortedBlocks = [...hierarchy.blocks].sort((a, b) => a.block.order - b.block.order);
  let residual = 0;
  let prevWeekDayIndex: number | null = null;
  let prevAbsoluteWeek: number | null = null;
  let absoluteWeekOffset = 0;
  let lastBlockIdx = -1;

  for (let blockIdx = 0; blockIdx < sortedBlocks.length; blockIdx++) {
    const blockData = sortedBlocks[blockIdx];

    if (blockIdx !== lastBlockIdx) {
      if (lastBlockIdx >= 0) {
        absoluteWeekOffset += sortedBlocks[lastBlockIdx].weeks.length;
      }
      lastBlockIdx = blockIdx;
    }

    const sortedWeeks = [...blockData.weeks].sort((a, b) => a.week.week_number - b.week.week_number);
    for (const weekData of sortedWeeks) {
      const sortedDays = [...weekData.days].sort((a, b) => a.day.day_number - b.day.day_number);
      const currentAbsoluteWeek = absoluteWeekOffset + weekData.week.week_number;

      for (const dayData of sortedDays) {
        const label = makeDayLabel(
          blockData.block.start_date ?? null,
          blockData.block.order,
          weekData.week.week_number,
          dayData.day.day_number,
          dayData.day.week_day_index ?? null,
        );

        const key = `${blockData.block.order}-${weekData.week.week_number}-${dayData.day.day_number}`;
        const dayRecords = dayIndex.get(key) ?? [];

        const dayScores: Record<LiftType, number> = { squat: 0, bench: 0, deadlift: 0 };

        for (const rec of dayRecords) {
          if (rec.reps <= 0 || rec.rpe <= 0) continue;
          const effort = Math.max(rec.rpe - 5, 0);
          const setFatigue = rec.reps * effort * LIFT_MULTIPLIERS[rec.classification.mainLift];
          dayScores[rec.classification.mainLift] += setFatigue;
          if (setFatigue > 0) activeLiftTypes.add(rec.classification.mainLift);
        }

        let total = dayScores.squat + dayScores.bench + dayScores.deadlift;
        let sleepAdjusted = false;

        if (sleepAdjustmentEnabled && dayData.day.sleep_quality !== null) {
          const clampedQuality = Math.max(0, Math.min(100, dayData.day.sleep_quality));
          const factor = 0.85 + 0.3 * (clampedQuality / 100);
          dayScores.squat *= factor;
          dayScores.bench *= factor;
          dayScores.deadlift *= factor;
          total = dayScores.squat + dayScores.bench + dayScores.deadlift;
          sleepAdjusted = true;
        }

        let effectiveDecay = BASE_DECAY;
        if (sleepAdjustmentEnabled && dayData.day.sleep_quality !== null) {
          const q = Math.max(0, Math.min(100, dayData.day.sleep_quality));
          const sleepFactor = 0.85 + 0.3 * (q / 100);
          effectiveDecay = BASE_DECAY / sleepFactor;
          effectiveDecay = Math.max(0.55, Math.min(0.85, effectiveDecay));
        }

        let decayGap = 1;
        if (
          prevWeekDayIndex !== null &&
          prevAbsoluteWeek !== null &&
          dayData.day.week_day_index !== null &&
          dayData.day.week_day_index !== undefined
        ) {
          const weeksBetween = currentAbsoluteWeek - prevAbsoluteWeek;
          const indexDiff = dayData.day.week_day_index - prevWeekDayIndex;
          const computedGap = weeksBetween * 7 + indexDiff;
          if (computedGap > 0) decayGap = computedGap;
        }

        residual = residual * Math.pow(effectiveDecay, decayGap) + total;

        if (dayData.day.week_day_index !== null && dayData.day.week_day_index !== undefined) {
          prevWeekDayIndex = dayData.day.week_day_index;
          prevAbsoluteWeek = currentAbsoluteWeek;
        }

        dataPoints.push({
          label,
          total,
          squat: dayScores.squat,
          bench: dayScores.bench,
          deadlift: dayScores.deadlift,
          residualFatigue: residual,
          sleepQuality: dayData.day.sleep_quality,
          sleepTime: dayData.day.sleep_time !== null ? Number(dayData.day.sleep_time) : null,
          sleepAdjusted,
        } as FatigueDataPoint & { residualFatigue: number });
      }
    }
  }

  const liftTypes: LiftType[] = (["squat", "bench", "deadlift"] as const).filter((lt) => activeLiftTypes.has(lt));
  return { dataPoints, liftTypes };
}

export function computeVolumeData(
  records: ParsedLiftRecord[],
  hierarchy: ProgramHierarchy,
): { dataPoints: WeekDataPoint[]; exercises: string[] } {
  const exerciseVolumes: Record<string, Record<string, number>> = {};
  const weekLabels: string[] = [];

  // Build week label list from hierarchy structure
  for (const blockData of hierarchy.blocks) {
    for (const weekData of blockData.weeks) {
      const label = makeWeekLabel(
        blockData.block.start_date ?? null,
        blockData.block.order,
        weekData.week.week_number,
      );
      weekLabels.push(label);
    }
  }

  // Aggregate volume from parsed records
  for (const rec of records) {
    const volume = rec.sets * rec.reps * rec.weight;
    if (volume <= 0) continue;

    const weekLabel = makeWeekLabel(rec.blockStartDate, rec.blockOrder, rec.weekNumber);

    if (!exerciseVolumes[rec.exerciseName]) {
      exerciseVolumes[rec.exerciseName] = {};
    }
    exerciseVolumes[rec.exerciseName][weekLabel] = (exerciseVolumes[rec.exerciseName][weekLabel] ?? 0) + volume;
  }

  const exercises = Object.keys(exerciseVolumes).sort();

  const dataPoints: WeekDataPoint[] = weekLabels.map((label) => {
    const point: WeekDataPoint = { label };
    for (const exercise of exercises) {
      const vol = exerciseVolumes[exercise][label];
      if (vol !== undefined) {
        point[exercise] = vol;
      }
    }
    return point;
  });

  return { dataPoints, exercises };
}

export function computeIntensityDistribution(
  records: ParsedLiftRecord[],
  hierarchy: ProgramHierarchy,
  userPRs: UserPRs,
): { dataPoints: IntensityZonePoint[]; hasData: boolean } {
  const dataPoints: IntensityZonePoint[] = [];
  let hasData = false;

  // Index records by week
  const weekIndex = new Map<string, ParsedLiftRecord[]>();
  for (const rec of records) {
    const key = `${rec.blockOrder}-${rec.weekNumber}`;
    const existing = weekIndex.get(key);
    if (existing) {
      existing.push(rec);
    } else {
      weekIndex.set(key, [rec]);
    }
  }

  for (const blockData of hierarchy.blocks) {
    for (const weekData of blockData.weeks) {
      const label = makeWeekLabel(
        blockData.block.start_date ?? null,
        blockData.block.order,
        weekData.week.week_number,
      );

      const key = `${blockData.block.order}-${weekData.week.week_number}`;
      const weekRecords = weekIndex.get(key) ?? [];

      const point: IntensityZonePoint = { label, zone1: 0, zone2: 0, zone3: 0, zone4: 0 };

      for (const rec of weekRecords) {
        const pr = userPRs[rec.classification.mainLift];
        if (!pr || pr <= 0) continue;
        if (rec.sets <= 0 || rec.weight <= 0) continue;

        const intensity = rec.weight / pr;
        if (intensity < 0.7) point.zone1 += rec.sets;
        else if (intensity < 0.8) point.zone2 += rec.sets;
        else if (intensity < 0.9) point.zone3 += rec.sets;
        else point.zone4 += rec.sets;

        hasData = true;
      }

      const totalSets = point.zone1 + point.zone2 + point.zone3 + point.zone4;
      if (totalSets > 0) {
        dataPoints.push(point);
      }
    }
  }

  return { dataPoints, hasData };
}

export function computeWeeklyLoadSummary(
  records: ParsedLiftRecord[],
  hierarchy: ProgramHierarchy,
  userPRs: UserPRs,
): WeeklyLoadRow[] {
  const rows: WeeklyLoadRow[] = [];

  // Index records by week
  const weekIndex = new Map<string, ParsedLiftRecord[]>();
  for (const rec of records) {
    const key = `${rec.blockOrder}-${rec.weekNumber}`;
    const existing = weekIndex.get(key);
    if (existing) {
      existing.push(rec);
    } else {
      weekIndex.set(key, [rec]);
    }
  }

  for (const blockData of hierarchy.blocks) {
    for (const weekData of blockData.weeks) {
      const label = makeWeekLabel(
        blockData.block.start_date ?? null,
        blockData.block.order,
        weekData.week.week_number,
      );

      const key = `${blockData.block.order}-${weekData.week.week_number}`;
      const weekRecords = weekIndex.get(key) ?? [];

      const liftData: Record<LiftType, { sets: number; reps: number[]; rpes: number[]; weights: number[]; volume: number; intensities: number[] }> = {
        squat: { sets: 0, reps: [], rpes: [], weights: [], volume: 0, intensities: [] },
        bench: { sets: 0, reps: [], rpes: [], weights: [], volume: 0, intensities: [] },
        deadlift: { sets: 0, reps: [], rpes: [], weights: [], volume: 0, intensities: [] },
      };

      for (const rec of weekRecords) {
        if (rec.sets <= 0 || rec.reps <= 0 || rec.weight <= 0) continue;

        const d = liftData[rec.classification.mainLift];
        d.sets += rec.sets;
        d.reps.push(rec.reps);
        d.weights.push(rec.weight);
        d.volume += rec.sets * rec.reps * rec.weight;
        if (rec.rpe > 0) d.rpes.push(rec.rpe);

        const pr = userPRs[rec.classification.mainLift];
        if (pr && pr > 0) d.intensities.push(rec.weight / pr);
      }

      const toSummary = (d: typeof liftData.squat): WeeklyLiftSummary => ({
        sets: d.sets,
        totalReps: d.reps.reduce((a, b) => a + b, 0),
        avgRpe: d.rpes.length > 0 ? d.rpes.reduce((a, b) => a + b, 0) / d.rpes.length : null,
        peakWeight: d.weights.length > 0 ? Math.max(...d.weights) : null,
        volume: d.volume,
        avgIntensityPct: d.intensities.length > 0 ? (d.intensities.reduce((a, b) => a + b, 0) / d.intensities.length) * 100 : null,
      });

      const row: WeeklyLoadRow = {
        label,
        squat: toSummary(liftData.squat),
        bench: toSummary(liftData.bench),
        deadlift: toSummary(liftData.deadlift),
      };

      const hasAnyData = row.squat.sets > 0 || row.bench.sets > 0 || row.deadlift.sets > 0;
      if (hasAnyData) rows.push(row);
    }
  }

  return rows;
}
