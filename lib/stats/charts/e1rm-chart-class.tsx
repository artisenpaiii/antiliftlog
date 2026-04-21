import type { ReactNode } from "react";
import { E1RMChart } from "@/components/e1rm-chart";
import { getRpePercentage } from "@/lib/rpe-chart";
import { buildDayIndex, makeDayLabel } from "../stats-helpers";
import type { UserPRs } from "../stats-helpers";
import type { StatsChart } from "../stats-chart";
import type { ParsedLiftRecord, ProgramHierarchy, LiftType } from "../types";
import type { E1RMDataPoint } from "../e1rm-computations";

function movingAverage(values: (number | null)[], window: number): (number | null)[] {
  return values.map((_, i) => {
    const slice = values
      .slice(Math.max(0, i - window + 1), i + 1)
      .filter((v): v is number => v !== null);
    if (slice.length === 0) return null;
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export class E1RMChartClass implements StatsChart {
  constructor(
    private records: ParsedLiftRecord[],
    private hierarchy: ProgramHierarchy,
    private userPRs: UserPRs,
  ) {}

  analyse(): ReactNode {
    const { dataPoints, activeLiftTypes } = this.computeData();
    if (dataPoints.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-muted-foreground">E1RM Progression</h3>
        </div>
        <E1RMChart data={dataPoints} activeLiftTypes={activeLiftTypes} userPRs={this.userPRs} />
      </div>
    );
  }

  private computeData(): { dataPoints: E1RMDataPoint[]; activeLiftTypes: LiftType[] } {
    const rawPoints: Omit<E1RMDataPoint, "squatSmoothed" | "benchSmoothed" | "deadliftSmoothed">[] = [];
    const activeLiftTypes = new Set<LiftType>();
    const dayIndex = buildDayIndex(this.records);

    const sortedBlocks = [...this.hierarchy.blocks].sort((a, b) => a.block.order - b.block.order);

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
            squatDetails: bestByLift.squat
              ? { weight: bestByLift.squat.weight, reps: bestByLift.squat.reps, rpe: bestByLift.squat.rpe }
              : null,
            benchDetails: bestByLift.bench
              ? { weight: bestByLift.bench.weight, reps: bestByLift.bench.reps, rpe: bestByLift.bench.rpe }
              : null,
            deadliftDetails: bestByLift.deadlift
              ? { weight: bestByLift.deadlift.weight, reps: bestByLift.deadlift.reps, rpe: bestByLift.deadlift.rpe }
              : null,
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

    const activeLiftTypesArr: LiftType[] = (["squat", "bench", "deadlift"] as const).filter((lt) =>
      activeLiftTypes.has(lt),
    );
    return { dataPoints, activeLiftTypes: activeLiftTypesArr };
  }
}
