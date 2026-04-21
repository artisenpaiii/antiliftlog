import type { ParsedLiftRecord } from "@/lib/stats/types";
import type { Competition } from "@/lib/types/database";
import type { BlockDateRange, Segment } from "./types";

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

function getDateForRecord(record: ParsedLiftRecord, ranges: BlockDateRange[]): Date | null {
  const range = ranges.find((r) => r.blockOrder === record.blockOrder);
  if (!range) return null;
  const offset = (record.weekNumber - 1) * 7 * DAY_MS;
  return new Date(range.startDate.getTime() + offset);
}

export function segmentRecordsByCompetition(
  records: ParsedLiftRecord[],
  competitions: Competition[],
  blockDateRanges: BlockDateRange[],
): Segment[] {
  if (competitions.length === 0) {
    return [
      {
        segmentId: "fallback",
        competitionId: null,
        competition: null,
        records,
        weeksBeforeComp: records.length > 0 ? [records] : [],
      },
    ];
  }

  const segments: Segment[] = [];
  let prevCompDate: Date | null = null;

  for (const comp of competitions) {
    const compDate = new Date(comp.meet_date + "T00:00:00");

    const segRecords = records.filter((rec) => {
      const recDate = getDateForRecord(rec, blockDateRanges);
      if (!recDate) return false;
      if (prevCompDate && recDate <= prevCompDate) return false;
      return recDate <= compDate;
    });

    // Bucket into weeksBeforeComp — index 0 = last 7 days before comp
    const buckets: ParsedLiftRecord[][] = [];
    for (const rec of segRecords) {
      const recDate = getDateForRecord(rec, blockDateRanges)!;
      const diffMs = compDate.getTime() - recDate.getTime();
      const bucketIndex = Math.floor(diffMs / WEEK_MS);
      if (bucketIndex >= 0) {
        while (buckets.length <= bucketIndex) buckets.push([]);
        buckets[bucketIndex].push(rec);
      }
    }

    segments.push({
      segmentId: comp.id,
      competitionId: comp.id,
      competition: comp,
      records: segRecords,
      weeksBeforeComp: buckets,
    });

    prevCompDate = compDate;
  }

  return segments;
}
