import type { Competition, PersonalBestLift } from "@/lib/types/database";
import type { ParsedLiftRecord, MainLift } from "@/lib/stats/types";

export type { ParsedLiftRecord };

export type FatigueZone = "low" | "moderate" | "high";
export type SegmentOutcome = "positive" | "negative" | "neutral" | "no_competition";

export interface BlockDateRange {
  blockId: string;
  blockOrder: number;
  blockName: string;
  numWeeks: number;
  startDate: Date;
  endDate: Date;
}

export interface ProgramTimeline {
  start: Date;
  end: Date;
}

export interface ExerciseFrequency {
  exerciseKey: string;
  exerciseLabel: string;
  mainLift: MainLift;
  sets: number;
  totalReps: number;
  appearances: number;
}

export interface CompResults {
  squat: number | null;
  bench: number | null;
  deadlift: number | null;
}

export interface Segment {
  segmentId: string;
  competitionId: string | null;
  competition: Competition | null;
  records: ParsedLiftRecord[];
  /** Index 0 = last 7 days before comp, index 1 = 7–14 days before, etc. */
  weeksBeforeComp: ParsedLiftRecord[][];
}

export interface SegmentAggregation {
  segmentId: string;
  competitionId: string | null;
  competition: Competition | null;
  outcome: SegmentOutcome;
  exerciseFrequency: ExerciseFrequency[];
  /** Indexed same as weeksBeforeComp (0 = last week before comp) */
  weeklyFatigue: FatigueZone[];
  /** Indexed same as weeksBeforeComp (0 = last week before comp) — total sets per week */
  weeklyVolume: number[];
  /** weeksBeforeComp index where deload was detected, or null */
  deloadWeekIndex: number | null;
  peakWeightImprovement: number | null;
  compResults: CompResults | null;
  /** Lifts where the user explicitly marked a PB at this competition */
  pbLiftsAtComp: PersonalBestLift[];
  /** Lifts where the comp result beat the athlete's best recorded before this comp date */
  pbLiftsBeatHistory: PersonalBestLift[];
}

export interface ExerciseImpactResult {
  exerciseKey: string;
  exerciseLabel: string;
  mainLift: MainLift;
  score: number;
  positiveAppearances: number;
  totalPositiveSegments: number;
  ruleLabel: string;
  isHighImpact: boolean;
}

export interface FatigueAnalysis {
  optimalZone: FatigueZone | null;
  zoneCounts: Record<FatigueZone, number>;
  supportingSegments: number;
  ruleLabel: string;
}

export interface VolumeAnalysis {
  hasTaper: boolean;
  peakWeekIndex: number | null;
  avgVolumeByWeek: number[];
  supportingSegments: number;
  ruleLabel: string;
}

export interface DeloadAnalysis {
  hasFinding: boolean;
  finding: { weeksBeforeComp: number; occurrences: number } | null;
  ruleLabel: string;
}

export interface AccessoryRecord {
  exerciseName: string;
  sets: number;
  blockOrder: number;
  weekNumber: number;
}

export interface AccessoryImpactResult {
  exerciseName: string;
  score: number;
  positiveAppearances: number;
  totalPositiveSegments: number;
  ruleLabel: string;
  isHighImpact: boolean;
}

export interface Pattern {
  patternId: string;
  description: string;
  rule: string;
  count: number;
  segmentIds: string[];
}

export interface CoachAnalysis {
  programId: string;
  timeline: ProgramTimeline | null;
  blockDateRanges: BlockDateRange[];
  competitions: Competition[];
  exerciseImpact: {
    perLift: Record<MainLift, ExerciseImpactResult[]>;
    overall: ExerciseImpactResult[];
    accessories: AccessoryImpactResult[];
  };
  fatigueAnalysis: FatigueAnalysis;
  deloadAnalysis: DeloadAnalysis;
  volumeAnalysis: VolumeAnalysis;
  compHistory: Array<{ competition: Competition; results: CompResults }>;
  patterns: Pattern[];
  hasCompetitions: boolean;
  totalSegments: number;
  positiveSegments: number;
}
