import type { ReactNode } from "react";
import { VolumeChart } from "@/components/volume-chart";
import { getExerciseKey, getExerciseLabel } from "../lift-parser";
import { makeWeekLabel } from "../stats-helpers";
import type { StatsChart } from "../stats-chart";
import type { ParsedLiftRecord, ProgramHierarchy, WeekDataPoint } from "../types";

export class WeekVolumeChart implements StatsChart {
  constructor(
    private records: ParsedLiftRecord[],
    private hierarchy: ProgramHierarchy,
    private selectedExercises?: string[],
  ) {}

  getExercises(): string[] {
    return this.computeData().exercises;
  }

  analyse(): ReactNode {
    const { dataPoints, exercises } = this.computeData();
    if (exercises.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No volume data found. Check that your column mapping matches the labels used in your program.
          </p>
        </div>
      );
    }
    const toShow =
      this.selectedExercises && this.selectedExercises.length > 0
        ? this.selectedExercises
        : exercises;
    return <VolumeChart data={dataPoints} exercises={toShow} />;
  }

  /** Public so format-export.ts can call it directly */
  computeData(): { dataPoints: WeekDataPoint[]; exercises: string[] } {
    const exerciseVolumes: Record<string, Record<string, number>> = {};
    const keyToLabel: Record<string, string> = {};
    const weekLabels: string[] = [];

    for (const blockData of this.hierarchy.blocks) {
      for (const weekData of blockData.weeks) {
        const label = makeWeekLabel(
          blockData.block.start_date ?? null,
          blockData.block.order,
          weekData.week.week_number,
        );
        weekLabels.push(label);
      }
    }

    for (const rec of this.records) {
      const volume = rec.sets * rec.reps * rec.weight;
      if (volume <= 0) continue;

      const key = getExerciseKey(rec.classification);
      const label = getExerciseLabel(rec.classification);
      keyToLabel[key] = label;

      const weekLabel = makeWeekLabel(rec.blockStartDate, rec.blockOrder, rec.weekNumber);

      if (!exerciseVolumes[key]) {
        exerciseVolumes[key] = {};
      }
      exerciseVolumes[key][weekLabel] = (exerciseVolumes[key][weekLabel] ?? 0) + volume;
    }

    const sortedKeys = Object.keys(exerciseVolumes).sort();
    const exercises = sortedKeys.map((key) => keyToLabel[key]);

    const dataPoints: WeekDataPoint[] = weekLabels.map((label) => {
      const point: WeekDataPoint = { label };
      for (const key of sortedKeys) {
        const displayLabel = keyToLabel[key];
        const vol = exerciseVolumes[key][label];
        if (vol !== undefined) {
          point[displayLabel] = vol;
        }
      }
      return point;
    });

    return { dataPoints, exercises };
  }
}
