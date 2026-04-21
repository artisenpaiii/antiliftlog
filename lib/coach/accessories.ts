import type { ProgramHierarchy } from "@/lib/stats/types";
import type { StatsSettings } from "@/lib/types/database";
import { LiftParser } from "@/lib/stats/lift-parser";
import { parseNumber } from "@/lib/stats/stats-helpers";
import type { AccessoryRecord, AccessoryImpactResult, BlockDateRange, SegmentAggregation } from "./types";

const DAY_MS = 86_400_000;

function findColumn(
  columns: { id: string; label: string }[],
  label: string,
): { id: string } | undefined {
  const lower = label.toLowerCase();
  return columns.find((c) => c.label.toLowerCase() === lower);
}

/** Parse rows the LiftParser skips (unclassified / accessory exercises). */
export function parseAccessoryRecords(
  hierarchy: ProgramHierarchy,
  settings: StatsSettings,
): AccessoryRecord[] {
  const parser = new LiftParser();
  const records: AccessoryRecord[] = [];

  for (const { block, weeks } of hierarchy.blocks) {
    for (const { week, days } of weeks) {
      for (const { columns, rows } of days) {
        const exerciseCol = findColumn(columns, settings.exercise_label);
        if (!exerciseCol) continue;

        const setsCol = findColumn(columns, settings.sets_label);
        const variationCol = settings.variation_label
          ? findColumn(columns, settings.variation_label)
          : undefined;

        for (const row of rows) {
          // Mirror LiftParser: skip separator rows
          if (row.cells.__separator_label !== undefined) continue;

          const exerciseName = row.cells[exerciseCol.id]?.trim();
          if (!exerciseName) continue;

          const variation = variationCol ? row.cells[variationCol.id]?.trim() || undefined : undefined;

          // Only keep exercises the main parser cannot classify
          if (parser.classify(exerciseName, variation) !== null) continue;

          const sets = setsCol ? parseNumber(row.cells[setsCol.id]) : 0;
          if (sets === 0) continue; // skip empty rows

          records.push({
            exerciseName,
            sets,
            blockOrder: block.order,
            weekNumber: week.week_number,
          });
        }
      }
    }
  }

  return records;
}

function getDateForAccessory(rec: AccessoryRecord, ranges: BlockDateRange[]): Date | null {
  const range = ranges.find((r) => r.blockOrder === rec.blockOrder);
  if (!range) return null;
  return new Date(range.startDate.getTime() + (rec.weekNumber - 1) * 7 * DAY_MS);
}

/**
 * Group accessories into the same competition windows used for the main segments.
 * Returns a map of segmentId → accessories in that window.
 */
export function groupAccessoriesBySegment(
  accessories: AccessoryRecord[],
  segmentIds: string[],
  competitionDates: Array<{ id: string; date: Date }>,
  ranges: BlockDateRange[],
): Map<string, AccessoryRecord[]> {
  const result = new Map<string, AccessoryRecord[]>(segmentIds.map((id) => [id, []]));

  if (competitionDates.length === 0) {
    // Fallback segment
    result.set("fallback", accessories);
    return result;
  }

  const sorted = [...competitionDates].sort((a, b) => a.date.getTime() - b.date.getTime());

  let prevDate: Date | null = null;
  for (const { id, date: compDate } of sorted) {
    const bucket = result.get(id);
    if (!bucket) continue;

    for (const rec of accessories) {
      const recDate = getDateForAccessory(rec, ranges);
      if (!recDate) continue;
      if (prevDate && recDate <= prevDate) continue;
      if (recDate <= compDate) bucket.push(rec);
    }

    prevDate = compDate;
  }

  return result;
}

/** Score accessories by presence in positive segments, same logic as scoreExerciseImpact. */
export function scoreAccessoryImpact(
  accessoriesBySegment: Map<string, AccessoryRecord[]>,
  aggregations: SegmentAggregation[],
): AccessoryImpactResult[] {
  const positiveSegs = aggregations.filter((a) => a.outcome === "positive");
  const totalPositiveSegments = positiveSegs.length;

  if (totalPositiveSegments === 0) return [];

  const counts = new Map<string, number>();

  for (const seg of positiveSegs) {
    const accessories = accessoriesBySegment.get(seg.segmentId) ?? [];
    const seen = new Set<string>();
    for (const rec of accessories) {
      const name = rec.exerciseName;
      if (!seen.has(name)) {
        seen.add(name);
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
  }

  return Array.from(counts.entries())
    .map(([exerciseName, count]) => {
      const score = Math.round((count / totalPositiveSegments) * 100);
      return {
        exerciseName,
        score,
        positiveAppearances: count,
        totalPositiveSegments,
        ruleLabel: `Appeared in ${count}/${totalPositiveSegments} positive segments (${score}%)`,
        isHighImpact: score >= 60,
      };
    })
    .sort((a, b) => b.score - a.score);
}
