import type { ProgramHierarchy } from "@/lib/stats/types";
import type { BlockDateRange, ProgramTimeline } from "./types";

const DAY_MS = 86_400_000;

export function buildBlockDateRanges(hierarchy: ProgramHierarchy): BlockDateRange[] {
  const sorted = [...hierarchy.blocks].sort((a, b) => a.block.order - b.block.order);

  const ranges: BlockDateRange[] = [];
  let prevEnd: Date | null = null;

  for (const { block, weeks } of sorted) {
    const numWeeks = weeks.length;
    if (numWeeks === 0) continue;

    let startDate: Date;

    if (block.start_date) {
      startDate = new Date(block.start_date + "T00:00:00");
    } else if (prevEnd) {
      startDate = new Date(prevEnd.getTime() + DAY_MS);
    } else {
      // Can't resolve — skip this block but don't break the chain
      continue;
    }

    // endDate is the first day AFTER the block (exclusive), so chaining is startDate = prevEnd
    const endDate = new Date(startDate.getTime() + numWeeks * 7 * DAY_MS);

    ranges.push({ blockId: block.id, blockOrder: block.order, blockName: block.name, numWeeks, startDate, endDate });
    prevEnd = endDate;
  }

  return ranges;
}

export function getProgramTimeline(ranges: BlockDateRange[]): ProgramTimeline | null {
  if (ranges.length === 0) return null;
  const start = new Date(Math.min(...ranges.map((r) => r.startDate.getTime())));
  const end = new Date(Math.max(...ranges.map((r) => r.endDate.getTime())));
  return { start, end };
}
