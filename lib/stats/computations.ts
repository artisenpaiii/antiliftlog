import type { FatigueDataPoint } from "@/components/fatigue-chart";
import type { StatsSettings } from "@/lib/types/database";
import { WEEKDAY_SHORT_LABELS } from "@/lib/types/database";
import type { ProgramHierarchy, WeekDataPoint, LiftType } from "./types";

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
