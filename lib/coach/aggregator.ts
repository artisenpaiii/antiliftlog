import type { Competition, PersonalBest, PersonalBestLift } from "@/lib/types/database";
import type { ParsedLiftRecord } from "@/lib/stats/types";
import type {
  Segment,
  SegmentAggregation,
  ExerciseFrequency,
  FatigueZone,
  SegmentOutcome,
  CompResults,
} from "./types";
import { getExerciseKey, getExerciseLabel } from "@/lib/stats/lift-parser";

function getFatigueZone(avgRpe: number): FatigueZone {
  if (avgRpe > 8.5) return "high";
  if (avgRpe >= 7) return "moderate";
  return "low";
}

function getBestMadeAttempt(comp: Competition, lift: "squat" | "bench" | "deadlift"): number | null {
  let attempts: Array<{ kg: number | null; good: boolean | null }>;
  if (lift === "squat") {
    attempts = [
      { kg: comp.squat_1_kg, good: comp.squat_1_good },
      { kg: comp.squat_2_kg, good: comp.squat_2_good },
      { kg: comp.squat_3_kg, good: comp.squat_3_good },
    ];
  } else if (lift === "bench") {
    attempts = [
      { kg: comp.bench_1_kg, good: comp.bench_1_good },
      { kg: comp.bench_2_kg, good: comp.bench_2_good },
      { kg: comp.bench_3_kg, good: comp.bench_3_good },
    ];
  } else {
    attempts = [
      { kg: comp.deadlift_1_kg, good: comp.deadlift_1_good },
      { kg: comp.deadlift_2_kg, good: comp.deadlift_2_good },
      { kg: comp.deadlift_3_kg, good: comp.deadlift_3_good },
    ];
  }
  const made = attempts.filter((a) => a.good === true && a.kg !== null).map((a) => a.kg!);
  return made.length > 0 ? Math.max(...made) : null;
}

function computeExerciseFrequency(records: ParsedLiftRecord[]): ExerciseFrequency[] {
  const map = new Map<string, ExerciseFrequency>();
  for (const rec of records) {
    if (!rec.classification) continue;
    const key = getExerciseKey(rec.classification);
    const existing = map.get(key);
    if (existing) {
      existing.sets += rec.sets;
      existing.totalReps += rec.sets * rec.reps;
      existing.appearances += 1;
    } else {
      map.set(key, {
        exerciseKey: key,
        exerciseLabel: getExerciseLabel(rec.classification),
        mainLift: rec.classification.mainLift,
        sets: rec.sets,
        totalReps: rec.sets * rec.reps,
        appearances: 1,
      });
    }
  }
  return Array.from(map.values());
}

function computeWeeklyVolume(weeksBeforeComp: ParsedLiftRecord[][]): number[] {
  return weeksBeforeComp.map((weekRecs) => weekRecs.reduce((s, r) => s + r.sets, 0));
}

function computeWeeklyFatigue(weeksBeforeComp: ParsedLiftRecord[][]): FatigueZone[] {
  return weeksBeforeComp.map((weekRecs) => {
    const rpeValues = weekRecs.map((r) => r.rpe).filter((v) => v > 0);
    if (rpeValues.length === 0) return "low";
    const avg = rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length;
    return getFatigueZone(avg);
  });
}

function detectDeload(weeksBeforeComp: ParsedLiftRecord[][]): number | null {
  // Reverse to get chronological order for rolling average
  const chronological = [...weeksBeforeComp].reverse();
  const weekSets = chronological.map((w) => w.reduce((s, r) => s + r.sets, 0));

  for (let i = 4; i < weekSets.length; i++) {
    const window = weekSets.slice(i - 4, i);
    const rollingAvg = window.reduce((a, b) => a + b, 0) / 4;
    if (rollingAvg >= 5 && weekSets[i] < 0.6 * rollingAvg) {
      // Convert chronological index back to weeksBeforeComp index
      return weeksBeforeComp.length - 1 - i;
    }
  }
  return null;
}

function withinBlockOutcome(weeksBeforeComp: ParsedLiftRecord[][]): SegmentOutcome {
  if (weeksBeforeComp.length < 2) return "neutral";

  const lastTwoRecords = [...(weeksBeforeComp[0] ?? []), ...(weeksBeforeComp[1] ?? [])];
  const n = weeksBeforeComp.length;
  const firstTwoRecords = [...(weeksBeforeComp[n - 1] ?? []), ...(weeksBeforeComp[n - 2] ?? [])];

  const peakOf = (recs: ParsedLiftRecord[]) => {
    const weights = recs.map((r) => r.weight).filter((w) => w > 0);
    return weights.length > 0 ? Math.max(...weights) : 0;
  };

  const peakLast = peakOf(lastTwoRecords);
  const peakFirst = peakOf(firstTwoRecords);

  if (peakFirst === 0) return "neutral";
  if (peakLast > peakFirst * 1.01) return "positive";
  if (peakLast < peakFirst * 0.99) return "negative";
  return "neutral";
}

const LIFT_KEYS: PersonalBestLift[] = ["squat", "bench", "deadlift"];

function computePbSignals(
  comp: Competition,
  compResults: CompResults,
  personalBests: PersonalBest[],
): { pbLiftsAtComp: PersonalBestLift[]; pbLiftsBeatHistory: PersonalBestLift[] } {
  const compDate = new Date(comp.meet_date + "T00:00:00").getTime();

  // Lifts explicitly marked as PBs at this competition
  const pbLiftsAtComp = personalBests
    .filter((pb) => pb.competition_id === comp.id)
    .map((pb) => pb.lift);

  // For each lift: check if the comp result beats the best PB recorded strictly before this comp date
  const pbLiftsBeatHistory: PersonalBestLift[] = [];
  for (const lift of LIFT_KEYS) {
    const result = compResults[lift];
    if (result === null) continue;

    const historyBefore = personalBests
      .filter((pb) => pb.lift === lift && pb.competition_id !== comp.id && new Date(pb.recorded_at + "T00:00:00").getTime() < compDate)
      .map((pb) => pb.kg);

    if (historyBefore.length > 0 && result > Math.max(...historyBefore)) {
      pbLiftsBeatHistory.push(lift);
    }
  }

  return { pbLiftsAtComp, pbLiftsBeatHistory };
}

export function aggregateSegment(seg: Segment, prevCompResults: CompResults | null, personalBests: PersonalBest[]): SegmentAggregation {
  const exerciseFrequency = computeExerciseFrequency(seg.records);
  const weeklyFatigue = computeWeeklyFatigue(seg.weeksBeforeComp);
  const weeklyVolume = computeWeeklyVolume(seg.weeksBeforeComp);
  const deloadWeekIndex = detectDeload(seg.weeksBeforeComp);

  let outcome: SegmentOutcome;
  let compResults: CompResults | null = null;
  let peakWeightImprovement: number | null = null;
  let pbLiftsAtComp: PersonalBestLift[] = [];
  let pbLiftsBeatHistory: PersonalBestLift[] = [];

  if (!seg.competition) {
    outcome = "no_competition";
  } else {
    compResults = {
      squat: getBestMadeAttempt(seg.competition, "squat"),
      bench: getBestMadeAttempt(seg.competition, "bench"),
      deadlift: getBestMadeAttempt(seg.competition, "deadlift"),
    };

    // Compute PB signals regardless of whether we have prev comp results
    const pbSignals = computePbSignals(seg.competition, compResults, personalBests);
    pbLiftsAtComp = pbSignals.pbLiftsAtComp;
    pbLiftsBeatHistory = pbSignals.pbLiftsBeatHistory;
    const pbCount = Math.max(
      new Set([...pbLiftsAtComp, ...pbLiftsBeatHistory]).size,
      pbLiftsAtComp.length,
    );

    if (!prevCompResults) {
      // First segment — use within-block fallback, then refine with PBs
      outcome = withinBlockOutcome(seg.weeksBeforeComp);
      const lastTwoRecords = [...(seg.weeksBeforeComp[0] ?? []), ...(seg.weeksBeforeComp[1] ?? [])];
      const n = seg.weeksBeforeComp.length;
      const firstTwoRecords = [...(seg.weeksBeforeComp[n - 1] ?? []), ...(seg.weeksBeforeComp[n - 2] ?? [])];
      const peakOf = (recs: ParsedLiftRecord[]) => {
        const weights = recs.map((r) => r.weight).filter((w) => w > 0);
        return weights.length > 0 ? Math.max(...weights) : 0;
      };
      peakWeightImprovement = peakOf(lastTwoRecords) - peakOf(firstTwoRecords);

      // PB data is a stronger signal than within-block weight comparison
      if (pbCount >= 2) outcome = "positive";
      else if (pbCount === 1 && outcome === "negative") outcome = "neutral";
    } else {
      const lifts = ["squat", "bench", "deadlift"] as const;
      let improved = 0;
      let regressed = 0;
      let compared = 0;
      for (const lift of lifts) {
        const curr = compResults[lift];
        const prev = prevCompResults[lift];
        if (curr !== null && prev !== null) {
          compared++;
          if (curr > prev) improved++;
          else if (curr < prev) regressed++;
        }
      }
      if (compared === 0) {
        outcome = "neutral";
      } else if (improved >= 2) {
        outcome = "positive";
      } else if (regressed === compared) {
        outcome = "negative";
      } else {
        outcome = "neutral";
      }

      // PB signals can upgrade outcome but not downgrade it
      if (pbCount >= 2 && outcome !== "positive") outcome = "positive";
      else if (pbCount >= 1 && outcome === "negative") outcome = "neutral";
    }
  }

  return {
    segmentId: seg.segmentId,
    competitionId: seg.competitionId,
    competition: seg.competition,
    outcome,
    exerciseFrequency,
    weeklyFatigue,
    weeklyVolume,
    deloadWeekIndex,
    peakWeightImprovement,
    compResults,
    pbLiftsAtComp,
    pbLiftsBeatHistory,
  };
}
