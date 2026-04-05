import { getRpePercentage } from "@/lib/rpe-chart";
import { buildDayIndex } from "./computations";
import type { ProgramHierarchy, LiftType, ParsedLiftRecord } from "./types";

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
    const WEEKDAY_SHORT: Record<number, string> = {
      0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun",
    };
    return `${WEEKDAY_SHORT[weekDayIndex]} B${blockOrder + 1}W${weekNumber}`;
  }
  return `B${blockOrder + 1}W${weekNumber}D${dayNumber}`;
}

export function computeE1RMData(
  records: ParsedLiftRecord[],
  hierarchy: ProgramHierarchy,
): { dataPoints: E1RMDataPoint[]; activeLiftTypes: LiftType[] } {
  const rawPoints: Omit<E1RMDataPoint, "squatSmoothed" | "benchSmoothed" | "deadliftSmoothed">[] = [];
  const activeLiftTypes = new Set<LiftType>();
  const dayIndex = buildDayIndex(records);

  const sortedBlocks = [...hierarchy.blocks].sort((a, b) => a.block.order - b.block.order);

  for (const blockData of sortedBlocks) {
    const sortedWeeks = [...blockData.weeks].sort((a, b) => a.week.week_number - b.week.week_number);
    for (const weekData of sortedWeeks) {
      const sortedDays = [...weekData.days].sort((a, b) => a.day.day_number - b.day.day_number);
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

        const bestByLift: Record<LiftType, { e1rm: number; weight: number; reps: number; rpe: number } | null> = {
          squat: null,
          bench: null,
          deadlift: null,
        };

        for (const rec of dayRecords) {
          if (rec.reps <= 0 || rec.rpe <= 0 || rec.weight <= 0) continue;

          const pct = getRpePercentage(rec.reps, rec.rpe);
          if (!pct) continue;

          const e1rm = rec.weight / pct;
          const liftType = rec.classification.mainLift;
          if (!bestByLift[liftType] || e1rm > bestByLift[liftType]!.e1rm) {
            bestByLift[liftType] = { e1rm, weight: rec.weight, reps: rec.reps, rpe: rec.rpe };
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
