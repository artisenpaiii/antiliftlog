import { getRpePercentage, roundToIncrement } from "@/lib/rpe-chart";
import { parseNumber, parseRpe, classifyLift, LIFT_MULTIPLIERS, BASE_DECAY } from "@/lib/stats/computations";
import type { Week, Day, DayColumn, DayRow, StatsSettings } from "@/lib/types/database";

export const FATIGUE_SCALE = 300;
export const MAX_FATIGUE_REDUCTION = 0.10;

/**
 * Computes the residual fatigue entering each day (before that day's own load).
 * Returns a map of dayId -> residual fatigue value.
 */
export function computeBlockResidualFatigue(
  weeks: Week[],
  daysByWeekId: Map<string, Day[]>,
  columnsByDayId: Map<string, DayColumn[]>,
  rowsByDayId: Map<string, DayRow[]>,
  statsSettings: StatsSettings,
): Map<string, number> {
  const result = new Map<string, number>();

  const rpeLabel = statsSettings.planned_rpe_label ?? statsSettings.rpe_label;
  if (!rpeLabel) return result;

  const sortedWeeks = [...weeks].sort((a, b) => a.week_number - b.week_number);
  let postDayResidual = 0;
  let prevWeekDayIndex: number | null = null;
  let prevWeekNumber: number | null = null;

  for (const week of sortedWeeks) {
    const days = daysByWeekId.get(week.id) ?? [];
    const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);

    for (const day of sortedDays) {
      // Compute gap from previous training day
      let decayGap = 1;
      if (
        prevWeekDayIndex !== null &&
        prevWeekNumber !== null &&
        day.week_day_index !== null &&
        day.week_day_index !== undefined
      ) {
        const weeksDiff = week.week_number - prevWeekNumber;
        const indexDiff = day.week_day_index - prevWeekDayIndex;
        const computedGap = weeksDiff * 7 + indexDiff;
        if (computedGap > 0) decayGap = computedGap;
      }

      // Entering residual = previous post-day residual decayed by gap
      const enteringResidual = postDayResidual * Math.pow(BASE_DECAY, decayGap);
      result.set(day.id, enteringResidual);

      // Compute today's fatigue contribution
      const columns = columnsByDayId.get(day.id) ?? [];
      const rows = rowsByDayId.get(day.id) ?? [];

      const exerciseCol = columns.find((c) => c.label === statsSettings.exercise_label);
      const repsCol = columns.find((c) => c.label === statsSettings.reps_label);
      const rpeCol = columns.find((c) => c.label === rpeLabel);

      let dailyFatigue = 0;
      if (exerciseCol && repsCol && rpeCol) {
        for (const row of rows) {
          const exercise = row.cells[exerciseCol.id]?.trim();
          if (!exercise) continue;
          const liftType = classifyLift(exercise);
          if (!liftType) continue;
          const reps = parseNumber(row.cells[repsCol.id]);
          const rpe = parseRpe(row.cells[rpeCol.id]);
          if (reps <= 0 || rpe <= 0) continue;
          const effort = Math.max(rpe - 5, 0);
          dailyFatigue += reps * effort * LIFT_MULTIPLIERS[liftType];
        }
      }

      postDayResidual = enteringResidual + dailyFatigue;

      if (day.week_day_index !== null && day.week_day_index !== undefined) {
        prevWeekDayIndex = day.week_day_index;
        prevWeekNumber = week.week_number;
      }
    }
  }

  return result;
}

/**
 * Returns a predicted weight string ("~102.5kg") for the weight cell, or null if prediction
 * is not possible (missing data, unrecognised lift, no 1RM, etc.).
 */
export function buildWeightPrediction(
  cells: Record<string, string>,
  columns: DayColumn[],
  statsSettings: StatsSettings,
  userPRs: { squat: number | null; bench: number | null; deadlift: number | null },
  residualFatigue: number,
  fatigueEnabled: boolean,
): string | null {
  const rpeColumnLabel = statsSettings.planned_rpe_label ?? statsSettings.rpe_label;
  if (!rpeColumnLabel) return null;

  const exerciseCol = columns.find((c) => c.label === statsSettings.exercise_label);
  const repsCol = columns.find((c) => c.label === statsSettings.reps_label);
  const rpeCol = columns.find((c) => c.label === rpeColumnLabel);

  if (!exerciseCol || !repsCol || !rpeCol) return null;

  const exercise = cells[exerciseCol.id]?.trim();
  if (!exercise) return null;

  const liftType = classifyLift(exercise);
  if (!liftType) return null;

  const oneRM = userPRs[liftType];
  if (!oneRM || oneRM <= 0) return null;

  const repsStr = cells[repsCol.id];
  const rpeStr = cells[rpeCol.id];
  if (!repsStr || !rpeStr) return null;

  const reps = parseNumber(repsStr);
  const rpe = parseRpe(rpeStr);
  if (reps <= 0 || rpe <= 0) return null;

  const pct = getRpePercentage(reps, rpe);
  if (pct === null) return null;

  let effectiveOneRM = oneRM;
  if (fatigueEnabled && residualFatigue > 0) {
    const fatigueReduction = Math.min(residualFatigue / FATIGUE_SCALE, MAX_FATIGUE_REDUCTION);
    effectiveOneRM = oneRM * (1 - fatigueReduction);
  }

  const weight = roundToIncrement(effectiveOneRM * pct, 2.5);
  return `~${weight}kg`;
}
