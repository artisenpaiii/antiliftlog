import type { ReactNode } from "react";
import { IntensityChart } from "@/components/intensity-chart";
import { makeWeekLabel } from "../stats-helpers";
import type { UserPRs } from "../stats-helpers";
import type { StatsChart } from "../stats-chart";
import type { ParsedLiftRecord, ProgramHierarchy, IntensityZonePoint } from "../types";

export class IntensityChartClass implements StatsChart {
  constructor(
    private records: ParsedLiftRecord[],
    private hierarchy: ProgramHierarchy,
    private userPRs: UserPRs,
  ) {}

  analyse(): ReactNode {
    const { dataPoints } = this.computeData();
    if (dataPoints.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-muted-foreground">Intensity Zone Distribution</h3>
        </div>
        <IntensityChart data={dataPoints} />
      </div>
    );
  }

  private computeData(): { dataPoints: IntensityZonePoint[]; hasData: boolean } {
    const dataPoints: IntensityZonePoint[] = [];
    let hasData = false;

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

        const point: IntensityZonePoint = { label, zone1: 0, zone2: 0, zone3: 0, zone4: 0 };

        for (const rec of weekRecords) {
          const pr = this.userPRs[rec.classification.mainLift];
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
}
