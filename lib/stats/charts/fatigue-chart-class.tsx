import type { ReactNode } from "react";
import { FatigueChart } from "@/components/fatigue-chart";
import type { FatigueDataPoint } from "@/components/fatigue-chart";
import { buildDayIndex, makeDayLabel, LIFT_MULTIPLIERS, BASE_DECAY } from "../stats-helpers";
import type { StatsChart } from "../stats-chart";
import type { ParsedLiftRecord, ProgramHierarchy, LiftType } from "../types";

export class FatigueChartClass implements StatsChart {
  constructor(
    private records: ParsedLiftRecord[],
    private hierarchy: ProgramHierarchy,
    private sleepEnabled: boolean,
    private rpeType: "actual" | "planned" = "actual",
  ) {}

  analyse(): ReactNode {
    const { dataPoints, liftTypes } = this.computeData();
    if (dataPoints.length === 0) return null;
    return <FatigueChart data={dataPoints} liftTypes={liftTypes} />;
  }

  /** Public so format-export.ts can call it directly */
  computeData(): { dataPoints: FatigueDataPoint[]; liftTypes: LiftType[] } {
    const dataPoints: FatigueDataPoint[] = [];
    const activeLiftTypes = new Set<LiftType>();
    const dayIndex = buildDayIndex(this.records);

    const sortedBlocks = [...this.hierarchy.blocks].sort((a, b) => a.block.order - b.block.order);
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
            const rpe = this.rpeType === "planned" && rec.plannedRpe > 0 ? rec.plannedRpe : rec.rpe;
            if (rec.reps <= 0 || rpe <= 0) continue;
            const effort = Math.max(rpe - 5, 0);
            const setFatigue = rec.reps * effort * LIFT_MULTIPLIERS[rec.classification.mainLift];
            dayScores[rec.classification.mainLift] += setFatigue;
            if (setFatigue > 0) activeLiftTypes.add(rec.classification.mainLift);
          }

          let total = dayScores.squat + dayScores.bench + dayScores.deadlift;
          let sleepAdjusted = false;

          if (this.sleepEnabled && dayData.day.sleep_quality !== null) {
            const clampedQuality = Math.max(0, Math.min(100, dayData.day.sleep_quality));
            const factor = 0.85 + 0.3 * (clampedQuality / 100);
            dayScores.squat *= factor;
            dayScores.bench *= factor;
            dayScores.deadlift *= factor;
            total = dayScores.squat + dayScores.bench + dayScores.deadlift;
            sleepAdjusted = true;
          }

          let effectiveDecay = BASE_DECAY;
          if (this.sleepEnabled && dayData.day.sleep_quality !== null) {
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
          });
        }
      }
    }

    const liftTypes: LiftType[] = (["squat", "bench", "deadlift"] as const).filter((lt) =>
      activeLiftTypes.has(lt),
    );
    return { dataPoints, liftTypes };
  }
}
