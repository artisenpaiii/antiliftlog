import type { Competition, PersonalBest } from "@/lib/types/database";
import type { MainLift } from "@/lib/stats/types";
import type { Tables } from "@/lib/db";
import type { CoachAnalysis, SegmentAggregation, CompResults } from "./types";
import { loadProgramHierarchy } from "@/lib/stats/load-hierarchy";
import { LiftParser } from "@/lib/stats/lift-parser";
import { buildBlockDateRanges, getProgramTimeline } from "./preprocessor";
import { mapCompetitionsToProgram } from "./competition-mapper";
import { segmentRecordsByCompetition } from "./segmenter";
import { aggregateSegment } from "./aggregator";
import { scoreExerciseImpact, analyzeFatigueZones, analyzeDeloadTiming, analyzeVolumePattern } from "./rule-engine";
import { extractPatterns } from "./pattern-engine";
import { parseAccessoryRecords, groupAccessoriesBySegment, scoreAccessoryImpact } from "./accessories";

function emptyCoachAnalysis(programId: string): CoachAnalysis {
  return {
    programId,
    timeline: null,
    blockDateRanges: [],
    competitions: [],
    exerciseImpact: {
      perLift: { squat: [], bench: [], deadlift: [] },
      overall: [],
      accessories: [],
    },
    fatigueAnalysis: {
      optimalZone: null,
      zoneCounts: { low: 0, moderate: 0, high: 0 },
      supportingSegments: 0,
      ruleLabel: "",
    },
    deloadAnalysis: { hasFinding: false, finding: null, ruleLabel: "" },
    volumeAnalysis: {
      hasTaper: false,
      peakWeekIndex: null,
      avgVolumeByWeek: [],
      supportingSegments: 0,
      ruleLabel: "",
    },
    compHistory: [],
    patterns: [],
    hasCompetitions: false,
    totalSegments: 0,
    positiveSegments: 0,
  };
}

export async function runCoachAnalysis(
  tables: Tables,
  programId: string,
  competitions: Competition[],
  personalBests: PersonalBest[],
): Promise<CoachAnalysis> {
  const { hierarchy, settings } = await loadProgramHierarchy(tables, programId);

  if (!settings) return emptyCoachAnalysis(programId);

  const parser = new LiftParser();
  const records = parser.parseHierarchy(hierarchy, settings);

  const blockDateRanges = buildBlockDateRanges(hierarchy);
  const timeline = getProgramTimeline(blockDateRanges);
  const mappedCompetitions = mapCompetitionsToProgram(competitions, timeline);
  const segments = segmentRecordsByCompetition(records, mappedCompetitions, blockDateRanges);

  // Aggregate each segment, passing the previous competition's results
  const aggregations: SegmentAggregation[] = [];
  let prevCompResults: CompResults | null = null;

  for (const seg of segments) {
    const agg = aggregateSegment(seg, prevCompResults, personalBests);
    aggregations.push(agg);
    if (agg.compResults) prevCompResults = agg.compResults;
  }

  // Accessories — exercises the LiftParser doesn't classify as big-3 variants
  const accessoryRecords = parseAccessoryRecords(hierarchy, settings);
  const competitionDates = mappedCompetitions.map((c) => ({
    id: c.id,
    date: new Date(c.meet_date + "T00:00:00"),
  }));
  const segmentIds = segments.map((s) => s.segmentId);
  const accessoriesBySegment = groupAccessoriesBySegment(
    accessoryRecords,
    segmentIds,
    competitionDates,
    blockDateRanges,
  );
  const accessories = scoreAccessoryImpact(accessoriesBySegment, aggregations);

  const overallImpact = scoreExerciseImpact(aggregations);
  const fatigueAnalysis = analyzeFatigueZones(aggregations);
  const deloadAnalysis = analyzeDeloadTiming(aggregations);
  const volumeAnalysis = analyzeVolumePattern(aggregations);
  const compHistory = aggregations
    .filter((a) => a.competition !== null && a.compResults !== null)
    .map((a) => ({ competition: a.competition!, results: a.compResults! }));
  const patterns = extractPatterns(aggregations, overallImpact, fatigueAnalysis, deloadAnalysis, volumeAnalysis);

  const mainLifts: MainLift[] = ["squat", "bench", "deadlift"];
  const perLift = Object.fromEntries(
    mainLifts.map((lift) => [lift, overallImpact.filter((e) => e.mainLift === lift)]),
  ) as Record<MainLift, typeof overallImpact>;

  const positiveSegments = aggregations.filter((a) => a.outcome === "positive").length;

  return {
    programId,
    timeline,
    blockDateRanges,
    competitions: mappedCompetitions,
    exerciseImpact: { perLift, overall: overallImpact, accessories },
    fatigueAnalysis,
    deloadAnalysis,
    volumeAnalysis,
    compHistory,
    patterns,
    hasCompetitions: mappedCompetitions.length > 0,
    totalSegments: aggregations.length,
    positiveSegments,
  };
}
