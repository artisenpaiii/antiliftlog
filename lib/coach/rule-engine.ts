import type { MainLift } from "@/lib/stats/types";
import type {
  SegmentAggregation,
  ExerciseImpactResult,
  FatigueAnalysis,
  DeloadAnalysis,
  VolumeAnalysis,
  FatigueZone,
} from "./types";

export function scoreExerciseImpact(aggregations: SegmentAggregation[]): ExerciseImpactResult[] {
  const positiveSegs = aggregations.filter((a) => a.outcome === "positive");
  const totalPositiveSegments = positiveSegs.length;

  if (totalPositiveSegments === 0) {
    // Collect all unique exercises to show zero scores
    const allExercises = new Map<string, { label: string; mainLift: MainLift }>();
    for (const agg of aggregations) {
      for (const ef of agg.exerciseFrequency) {
        if (!allExercises.has(ef.exerciseKey)) {
          allExercises.set(ef.exerciseKey, { label: ef.exerciseLabel, mainLift: ef.mainLift });
        }
      }
    }
    return Array.from(allExercises.entries()).map(([exerciseKey, meta]) => ({
      exerciseKey,
      exerciseLabel: meta.label,
      mainLift: meta.mainLift,
      score: 0,
      positiveAppearances: 0,
      totalPositiveSegments: 0,
      ruleLabel: "No positive segments to compare against",
      isHighImpact: false,
    }));
  }

  const exerciseAppearances = new Map<
    string,
    { label: string; mainLift: MainLift; count: number }
  >();

  for (const seg of positiveSegs) {
    // Count each exercise once per segment (presence, not frequency)
    const seen = new Set<string>();
    for (const ef of seg.exerciseFrequency) {
      if (!seen.has(ef.exerciseKey)) {
        seen.add(ef.exerciseKey);
        const existing = exerciseAppearances.get(ef.exerciseKey);
        if (existing) {
          existing.count += 1;
        } else {
          exerciseAppearances.set(ef.exerciseKey, {
            label: ef.exerciseLabel,
            mainLift: ef.mainLift,
            count: 1,
          });
        }
      }
    }
  }

  const results: ExerciseImpactResult[] = [];
  for (const [exerciseKey, meta] of exerciseAppearances.entries()) {
    const score = Math.round((meta.count / totalPositiveSegments) * 100);
    results.push({
      exerciseKey,
      exerciseLabel: meta.label,
      mainLift: meta.mainLift,
      score,
      positiveAppearances: meta.count,
      totalPositiveSegments,
      ruleLabel: `Appeared in ${meta.count}/${totalPositiveSegments} positive segments (${score}%)`,
      isHighImpact: score >= 60,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

export function analyzeFatigueZones(aggregations: SegmentAggregation[]): FatigueAnalysis {
  const positiveSegs = aggregations.filter((a) => a.outcome === "positive");

  const zoneCounts: Record<FatigueZone, number> = { low: 0, moderate: 0, high: 0 };
  let supportingSegments = 0;

  for (const seg of positiveSegs) {
    // Weeks 2–4 before comp = weeksBeforeComp indices 1–3
    const relevantWeeks = [
      seg.weeklyFatigue[1],
      seg.weeklyFatigue[2],
      seg.weeklyFatigue[3],
    ].filter((z): z is FatigueZone => z !== undefined);

    if (relevantWeeks.length > 0) {
      supportingSegments++;
      for (const zone of relevantWeeks) {
        zoneCounts[zone]++;
      }
    }
  }

  if (supportingSegments === 0) {
    return {
      optimalZone: null,
      zoneCounts,
      supportingSegments: 0,
      ruleLabel: "Not enough RPE data to determine optimal intensity zone",
    };
  }

  const optimalZone = (Object.entries(zoneCounts) as [FatigueZone, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0][0];

  const topCount = zoneCounts[optimalZone];

  return {
    optimalZone,
    zoneCounts,
    supportingSegments,
    ruleLabel: `${capitalize(optimalZone)} RPE in weeks 2–4 before competition appeared ${topCount} time(s) in positive segments`,
  };
}

export function analyzeDeloadTiming(aggregations: SegmentAggregation[]): DeloadAnalysis {
  // Only segments that have both a deload AND a competition
  const relevantSegs = aggregations.filter(
    (a) => a.deloadWeekIndex !== null && a.competition !== null,
  );

  if (relevantSegs.length < 2) {
    return {
      hasFinding: false,
      finding: null,
      ruleLabel:
        relevantSegs.length === 0
          ? "No deload weeks detected in competition prep blocks"
          : "Not enough occurrences to identify a deload pattern (need ≥ 2)",
    };
  }

  // Convert deloadWeekIndex to "weeks before comp" (index 0 = 1 week before comp)
  const weeksBeforeCompArr = relevantSegs.map((s) => s.deloadWeekIndex! + 1);
  weeksBeforeCompArr.sort((a, b) => a - b);
  const median = weeksBeforeCompArr[Math.floor(weeksBeforeCompArr.length / 2)];

  return {
    hasFinding: true,
    finding: { weeksBeforeComp: median, occurrences: relevantSegs.length },
    ruleLabel: `Deload detected ${relevantSegs.length} times approximately ${median} week(s) before competition`,
  };
}

export function analyzeVolumePattern(aggregations: SegmentAggregation[]): VolumeAnalysis {
  const positiveWithComp = aggregations.filter(
    (a) => a.outcome === "positive" && a.competition !== null && a.weeklyVolume.length > 0,
  );

  if (positiveWithComp.length < 2) {
    return {
      hasTaper: false,
      peakWeekIndex: null,
      avgVolumeByWeek: [],
      supportingSegments: positiveWithComp.length,
      ruleLabel: "Not enough positive competition segments to detect a volume pattern (need ≥ 2)",
    };
  }

  const minLen = Math.min(...positiveWithComp.map((a) => a.weeklyVolume.length));
  const avgVolumeByWeek: number[] = Array.from({ length: minLen }, (_, i) => {
    const sum = positiveWithComp.reduce((acc, a) => acc + (a.weeklyVolume[i] ?? 0), 0);
    return sum / positiveWithComp.length;
  });

  // peakWeekIndex among weeks 2+ (index 2 onwards = ≥3 weeks before comp)
  let peakWeekIndex: number | null = null;
  let peakVol = -1;
  for (let i = 2; i < avgVolumeByWeek.length; i++) {
    if (avgVolumeByWeek[i] > peakVol) {
      peakVol = avgVolumeByWeek[i];
      peakWeekIndex = i;
    }
  }

  // Taper: avg volume in weeks 0–1 < 70% of peak (from weeks 2+), in ≥2 positive segments
  let taperCount = 0;
  if (peakWeekIndex !== null) {
    for (const seg of positiveWithComp) {
      const segPeak = Math.max(...seg.weeklyVolume.slice(2));
      const finalVol = ((seg.weeklyVolume[0] ?? 0) + (seg.weeklyVolume[1] ?? 0)) / 2;
      if (segPeak > 0 && finalVol < 0.7 * segPeak) taperCount++;
    }
  }

  const hasTaper = taperCount >= 2;

  return {
    hasTaper,
    peakWeekIndex,
    avgVolumeByWeek,
    supportingSegments: positiveWithComp.length,
    ruleLabel: hasTaper
      ? `Volume drops below 70% of peak in weeks 1–2 before comp in ${taperCount} positive blocks`
      : "No consistent volume taper detected in final 2 weeks before competition",
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
