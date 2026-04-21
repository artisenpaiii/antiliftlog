import type { ReactNode } from "react";
import { WeeklyLoadTable } from "@/components/weekly-load-table";
import { makeWeekLabel } from "../stats-helpers";
import type { UserPRs } from "../stats-helpers";
import type { StatsChart } from "../stats-chart";
import type { ParsedLiftRecord, ProgramHierarchy, LiftType, WeeklyLoadRow, WeeklyLiftSummary } from "../types";

export class WeeklyLoadChartClass implements StatsChart {
  constructor(
    private records: ParsedLiftRecord[],
    private hierarchy: ProgramHierarchy,
    private userPRs: UserPRs,
  ) {}

  analyse(): ReactNode {
    const rows = this.computeData();
    if (rows.length === 0) return null;
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Weekly Load Summary</h3>
        <p className="text-xs text-muted-foreground">
          Volume color = avg intensity vs your gym PRs. Peak weight in kg.
        </p>
        <WeeklyLoadTable rows={rows} />
      </div>
    );
  }

  private computeData(): WeeklyLoadRow[] {
    const rows: WeeklyLoadRow[] = [];

    const weekIndex = new Map<string, ParsedLiftRecord[]>();
    for (const rec of this.records) {
      const key = `${rec.blockOrder}-${rec.weekNumber}`;
      const existing = weekIndex.get(key);
      if (existing) {
        existing.push(rec);
      } else {
        weekIndex.set(key, [rec]);
      }
    }

    for (const blockData of this.hierarchy.blocks) {
      for (const weekData of blockData.weeks) {
        const label = makeWeekLabel(
          blockData.block.start_date ?? null,
          blockData.block.order,
          weekData.week.week_number,
        );

        const key = `${blockData.block.order}-${weekData.week.week_number}`;
        const weekRecords = weekIndex.get(key) ?? [];

        type LiftAccum = {
          sets: number;
          reps: number[];
          rpes: number[];
          weights: number[];
          volume: number;
          intensities: number[];
        };

        const liftData: Record<LiftType, LiftAccum> = {
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

          const pr = this.userPRs[rec.classification.mainLift];
          if (pr && pr > 0) d.intensities.push(rec.weight / pr);
        }

        const toSummary = (d: LiftAccum): WeeklyLiftSummary => ({
          sets: d.sets,
          totalReps: d.reps.reduce((a, b) => a + b, 0),
          avgRpe: d.rpes.length > 0 ? d.rpes.reduce((a, b) => a + b, 0) / d.rpes.length : null,
          peakWeight: d.weights.length > 0 ? Math.max(...d.weights) : null,
          volume: d.volume,
          avgIntensityPct:
            d.intensities.length > 0
              ? (d.intensities.reduce((a, b) => a + b, 0) / d.intensities.length) * 100
              : null,
        });

        const row: WeeklyLoadRow = {
          label,
          squat: toSummary(liftData.squat),
          bench: toSummary(liftData.bench),
          deadlift: toSummary(liftData.deadlift),
        };

        if (row.squat.sets > 0 || row.bench.sets > 0 || row.deadlift.sets > 0) {
          rows.push(row);
        }
      }
    }

    return rows;
  }
}
