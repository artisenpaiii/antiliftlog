import type { FatigueDataPoint } from "@/components/fatigue-chart";
import type { StatsSettings } from "@/lib/types/database";
import { WEEKDAY_SHORT_LABELS } from "@/lib/types/database";
import type { ProgramHierarchy, WeekDataPoint, LiftType } from "./types";

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

// Default daily decay of residual fatigue.
// Interpretation: ~70% of yesterday's fatigue carries into today (≈30% clears per 24h).
// This produces a ~2-day half-life (0.70² ≈ 0.49), which matches typical 24–72h recovery
// windows seen in heavy compound lifting (strength performance and neuromuscular recovery).
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
  // Handle ranges like "6-7.5" by taking the upper bound
  const parts = cleaned.split("-").filter((p) => p !== "");
  if (parts.length >= 2) {
    const upper = parseFloat(parts[parts.length - 1]);
    return isNaN(upper) ? 0 : upper;
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function classifyLift(exerciseName: string): LiftType | null {
  const lower = exerciseName.toLowerCase();
  if (lower.includes("deadlift") || lower.includes("dead lift")) return "deadlift";
  if (lower.includes("squat")) return "squat";
  if (lower.includes("bench")) return "bench";
  return null;
}

export function computeFatigueData(
  hierarchy: ProgramHierarchy,
  settings: StatsSettings,
  sleepAdjustmentEnabled: boolean,
): { dataPoints: FatigueDataPoint[]; liftTypes: LiftType[] } {
  const dataPoints: FatigueDataPoint[] = [];
  const activeLiftTypes = new Set<LiftType>();

  if (!settings.rpe_label) {
    return { dataPoints: [], liftTypes: [] };
  }

  // Ensure chronological traversal (important for residual fatigue)
  const sortedBlocks = [...hierarchy.blocks].sort((a, b) => a.block.order - b.block.order);
  let residual = 0;

  // Track previous day's position for gap-aware decay
  let prevWeekDayIndex: number | null = null;
  let prevAbsoluteWeek: number | null = null;
  let absoluteWeekOffset = 0;
  let lastBlockIdx = -1;

  for (let blockIdx = 0; blockIdx < sortedBlocks.length; blockIdx++) {
    const blockData = sortedBlocks[blockIdx];

    // At each block boundary, accumulate week offset
    if (blockIdx !== lastBlockIdx) {
      if (lastBlockIdx >= 0) {
        const prevBlock = sortedBlocks[lastBlockIdx];
        const prevBlockWeekCount = prevBlock.weeks.length;
        absoluteWeekOffset += prevBlockWeekCount;
      }
      lastBlockIdx = blockIdx;
    }

    const sortedWeeks = [...blockData.weeks].sort((a, b) => a.week.week_number - b.week.week_number);
    for (const weekData of sortedWeeks) {
      const sortedDays = [...weekData.days].sort((a, b) => a.day.day_number - b.day.day_number);
      const currentAbsoluteWeek = absoluteWeekOffset + weekData.week.week_number;

      for (const dayData of sortedDays) {
        let label: string;
        if (blockData.block.start_date && dayData.day.week_day_index !== null && dayData.day.week_day_index !== undefined) {
          const start = new Date(blockData.block.start_date + "T00:00:00");
          const dayOffset = (weekData.week.week_number - 1) * 7 + dayData.day.week_day_index;
          const date = new Date(start);
          date.setDate(start.getDate() + dayOffset);
          label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        } else if (dayData.day.week_day_index !== null && dayData.day.week_day_index !== undefined) {
          label = `${WEEKDAY_SHORT_LABELS[dayData.day.week_day_index]} B${blockData.block.order + 1}W${weekData.week.week_number}`;
        } else {
          label = `B${blockData.block.order + 1}W${weekData.week.week_number}D${dayData.day.day_number}`;
        }

        const exerciseCol = dayData.columns.find((c) => c.label === settings.exercise_label);
        const repsCol = dayData.columns.find((c) => c.label === settings.reps_label);
        const rpeCol = dayData.columns.find((c) => c.label === settings.rpe_label);

        const dayScores: Record<LiftType, number> = {
          squat: 0,
          bench: 0,
          deadlift: 0,
        };

        if (exerciseCol && repsCol && rpeCol) {
          for (const row of dayData.rows) {
            const exercise = row.cells[exerciseCol.id]?.trim();
            if (!exercise) continue;

            const liftType = classifyLift(exercise);
            if (!liftType) continue;

            const reps = parseNumber(row.cells[repsCol.id]);
            const rpe = parseRpe(row.cells[rpeCol.id]);

            if (reps <= 0 || rpe <= 0) continue;

            const effort = Math.max(rpe - 5, 0);
            const setFatigue = reps * effort * LIFT_MULTIPLIERS[liftType];
            dayScores[liftType] += setFatigue;

            if (setFatigue > 0) activeLiftTypes.add(liftType);
          }
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

        // Compute gap between training days for rest-day aware decay
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

export function computeVolumeData(hierarchy: ProgramHierarchy, settings: StatsSettings): { dataPoints: WeekDataPoint[]; exercises: string[] } {
  const exerciseVolumes: Record<string, Record<string, number>> = {};
  const weekLabels: string[] = [];

  for (const blockData of hierarchy.blocks) {
    for (const weekData of blockData.weeks) {
      let label: string;
      if (blockData.block.start_date) {
        const start = new Date(blockData.block.start_date + "T00:00:00");
        const weekOffset = (weekData.week.week_number - 1) * 7;
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + weekOffset);
        label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } else {
        label = `B${blockData.block.order + 1}W${weekData.week.week_number}`;
      }
      weekLabels.push(label);

      for (const dayData of weekData.days) {
        const exerciseCol = dayData.columns.find((c) => c.label === settings.exercise_label);
        const setsCol = dayData.columns.find((c) => c.label === settings.sets_label);
        const repsCol = dayData.columns.find((c) => c.label === settings.reps_label);
        const weightCol = dayData.columns.find((c) => c.label === settings.weight_label);

        if (!exerciseCol || !setsCol || !repsCol || !weightCol) continue;

        for (const row of dayData.rows) {
          const exercise = row.cells[exerciseCol.id]?.trim();
          if (!exercise) continue;

          const sets = parseNumber(row.cells[setsCol.id]);
          const reps = parseNumber(row.cells[repsCol.id]);
          const weight = parseNumber(row.cells[weightCol.id]);
          const volume = sets * reps * weight;

          if (volume <= 0) continue;

          if (!exerciseVolumes[exercise]) {
            exerciseVolumes[exercise] = {};
          }
          exerciseVolumes[exercise][label] = (exerciseVolumes[exercise][label] ?? 0) + volume;
        }
      }
    }
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
  hierarchy: ProgramHierarchy,
  settings: StatsSettings,
  userPRs: UserPRs,
): { dataPoints: IntensityZonePoint[]; hasData: boolean } {
  const dataPoints: IntensityZonePoint[] = [];
  let hasData = false;

  for (const blockData of hierarchy.blocks) {
    for (const weekData of blockData.weeks) {
      let label: string;
      if (blockData.block.start_date) {
        const start = new Date(blockData.block.start_date + "T00:00:00");
        const weekOffset = (weekData.week.week_number - 1) * 7;
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + weekOffset);
        label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } else {
        label = `B${blockData.block.order + 1}W${weekData.week.week_number}`;
      }

      const point: IntensityZonePoint = { label, zone1: 0, zone2: 0, zone3: 0, zone4: 0 };

      for (const dayData of weekData.days) {
        const exerciseCol = dayData.columns.find((c) => c.label === settings.exercise_label);
        const setsCol = dayData.columns.find((c) => c.label === settings.sets_label);
        const weightCol = dayData.columns.find((c) => c.label === settings.weight_label);

        if (!exerciseCol || !setsCol || !weightCol) continue;

        for (const row of dayData.rows) {
          const exercise = row.cells[exerciseCol.id]?.trim();
          if (!exercise) continue;

          const liftType = classifyLift(exercise);
          if (!liftType) continue;

          const pr = userPRs[liftType];
          if (!pr || pr <= 0) continue;

          const sets = parseNumber(row.cells[setsCol.id]);
          const weight = parseNumber(row.cells[weightCol.id]);
          if (sets <= 0 || weight <= 0) continue;

          const intensity = weight / pr;
          if (intensity < 0.7) point.zone1 += sets;
          else if (intensity < 0.8) point.zone2 += sets;
          else if (intensity < 0.9) point.zone3 += sets;
          else point.zone4 += sets;

          hasData = true;
        }
      }

      const totalSets = point.zone1 + point.zone2 + point.zone3 + point.zone4;
      if (totalSets > 0) {
        dataPoints.push(point);
      }
    }
  }

  return { dataPoints, hasData };
}

function emptyLiftSummary(): WeeklyLiftSummary {
  return { sets: 0, totalReps: 0, avgRpe: null, peakWeight: null, volume: 0, avgIntensityPct: null };
}

export function computeWeeklyLoadSummary(
  hierarchy: ProgramHierarchy,
  settings: StatsSettings,
  userPRs: UserPRs,
): WeeklyLoadRow[] {
  const rows: WeeklyLoadRow[] = [];

  for (const blockData of hierarchy.blocks) {
    for (const weekData of blockData.weeks) {
      let label: string;
      if (blockData.block.start_date) {
        const start = new Date(blockData.block.start_date + "T00:00:00");
        const weekOffset = (weekData.week.week_number - 1) * 7;
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + weekOffset);
        label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } else {
        label = `B${blockData.block.order + 1}W${weekData.week.week_number}`;
      }

      const liftData: Record<LiftType, { sets: number; reps: number[]; rpes: number[]; weights: number[]; volume: number; intensities: number[] }> = {
        squat: { sets: 0, reps: [], rpes: [], weights: [], volume: 0, intensities: [] },
        bench: { sets: 0, reps: [], rpes: [], weights: [], volume: 0, intensities: [] },
        deadlift: { sets: 0, reps: [], rpes: [], weights: [], volume: 0, intensities: [] },
      };

      for (const dayData of weekData.days) {
        const exerciseCol = dayData.columns.find((c) => c.label === settings.exercise_label);
        const setsCol = dayData.columns.find((c) => c.label === settings.sets_label);
        const repsCol = dayData.columns.find((c) => c.label === settings.reps_label);
        const weightCol = dayData.columns.find((c) => c.label === settings.weight_label);
        const rpeCol = settings.rpe_label ? dayData.columns.find((c) => c.label === settings.rpe_label) : undefined;

        if (!exerciseCol || !setsCol || !repsCol || !weightCol) continue;

        for (const row of dayData.rows) {
          const exercise = row.cells[exerciseCol.id]?.trim();
          if (!exercise) continue;

          const liftType = classifyLift(exercise);
          if (!liftType) continue;

          const sets = parseNumber(row.cells[setsCol.id]);
          const reps = parseNumber(row.cells[repsCol.id]);
          const weight = parseNumber(row.cells[weightCol.id]);
          const rpe = rpeCol ? parseRpe(row.cells[rpeCol.id]) : 0;

          if (sets <= 0 || reps <= 0 || weight <= 0) continue;

          const d = liftData[liftType];
          d.sets += sets;
          d.reps.push(reps);
          d.weights.push(weight);
          d.volume += sets * reps * weight;
          if (rpe > 0) d.rpes.push(rpe);

          const pr = userPRs[liftType];
          if (pr && pr > 0) d.intensities.push(weight / pr);
        }
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
