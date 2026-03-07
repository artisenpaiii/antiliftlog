import { getRpePercentage } from "@/lib/rpe-chart";
import { WEEKDAY_SHORT_LABELS } from "@/lib/types/database";
import { parseNumber, parseRpe, classifyLift } from "./computations";
import type { ProgramHierarchy, LiftType } from "./types";
import type { StatsSettings } from "@/lib/types/database";

export interface E1RMDetails {
  weight: number;
  reps: number;
  rpe: number;
}

export interface E1RMDataPoint {
  label: string;
  squat: number | null;
  bench: number | null;
  deadlift: number | null;
  squatSmoothed: number | null;
  benchSmoothed: number | null;
  deadliftSmoothed: number | null;
  squatDetails: E1RMDetails | null;
  benchDetails: E1RMDetails | null;
  deadliftDetails: E1RMDetails | null;
}

function movingAverage(values: (number | null)[], window: number): (number | null)[] {
  return values.map((_, i) => {
    const slice = values
      .slice(Math.max(0, i - window + 1), i + 1)
      .filter((v): v is number => v !== null);
    if (slice.length === 0) return null;
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export function computeE1RMData(
  hierarchy: ProgramHierarchy,
  settings: StatsSettings,
): { dataPoints: E1RMDataPoint[]; activeLiftTypes: LiftType[] } {
  if (!settings.rpe_label || !settings.weight_label) {
    return { dataPoints: [], activeLiftTypes: [] };
  }

  const rawPoints: Omit<E1RMDataPoint, "squatSmoothed" | "benchSmoothed" | "deadliftSmoothed">[] = [];
  const activeLiftTypes = new Set<LiftType>();

  const sortedBlocks = [...hierarchy.blocks].sort((a, b) => a.block.order - b.block.order);

  for (const blockData of sortedBlocks) {
    const sortedWeeks = [...blockData.weeks].sort((a, b) => a.week.week_number - b.week.week_number);
    for (const weekData of sortedWeeks) {
      const sortedDays = [...weekData.days].sort((a, b) => a.day.day_number - b.day.day_number);
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
        const weightCol = dayData.columns.find((c) => c.label === settings.weight_label);

        if (!exerciseCol || !repsCol || !rpeCol || !weightCol) continue;

        const bestByLift: Record<LiftType, { e1rm: number; weight: number; reps: number; rpe: number } | null> = {
          squat: null,
          bench: null,
          deadlift: null,
        };

        for (const row of dayData.rows) {
          const exercise = row.cells[exerciseCol.id]?.trim();
          if (!exercise) continue;

          const liftType = classifyLift(exercise);
          if (!liftType) continue;

          const reps = parseNumber(row.cells[repsCol.id]);
          const rpe = parseRpe(row.cells[rpeCol.id]);
          const weight = parseNumber(row.cells[weightCol.id]);

          if (reps <= 0 || rpe <= 0 || weight <= 0) continue;

          const pct = getRpePercentage(reps, rpe);
          if (!pct) continue;

          const e1rm = weight / pct;
          if (!bestByLift[liftType] || e1rm > bestByLift[liftType]!.e1rm) {
            bestByLift[liftType] = { e1rm, weight, reps, rpe };
          }
        }

        const hasData = Object.values(bestByLift).some((v) => v !== null);
        if (!hasData) continue;

        for (const lift of ["squat", "bench", "deadlift"] as LiftType[]) {
          if (bestByLift[lift]) activeLiftTypes.add(lift);
        }

        rawPoints.push({
          label,
          squat: bestByLift.squat?.e1rm ?? null,
          bench: bestByLift.bench?.e1rm ?? null,
          deadlift: bestByLift.deadlift?.e1rm ?? null,
          squatDetails: bestByLift.squat ? { weight: bestByLift.squat.weight, reps: bestByLift.squat.reps, rpe: bestByLift.squat.rpe } : null,
          benchDetails: bestByLift.bench ? { weight: bestByLift.bench.weight, reps: bestByLift.bench.reps, rpe: bestByLift.bench.rpe } : null,
          deadliftDetails: bestByLift.deadlift ? { weight: bestByLift.deadlift.weight, reps: bestByLift.deadlift.reps, rpe: bestByLift.deadlift.rpe } : null,
        });
      }
    }
  }

  const SMOOTH_WINDOW = 5;
  const squatSmoothed = movingAverage(rawPoints.map((d) => d.squat), SMOOTH_WINDOW);
  const benchSmoothed = movingAverage(rawPoints.map((d) => d.bench), SMOOTH_WINDOW);
  const deadliftSmoothed = movingAverage(rawPoints.map((d) => d.deadlift), SMOOTH_WINDOW);

  const dataPoints: E1RMDataPoint[] = rawPoints.map((point, i) => ({
    ...point,
    squatSmoothed: squatSmoothed[i],
    benchSmoothed: benchSmoothed[i],
    deadliftSmoothed: deadliftSmoothed[i],
  }));

  const activeLiftTypesArr: LiftType[] = (["squat", "bench", "deadlift"] as const).filter((lt) => activeLiftTypes.has(lt));
  return { dataPoints, activeLiftTypes: activeLiftTypesArr };
}
