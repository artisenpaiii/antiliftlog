import type { SegmentAggregation, ExerciseImpactResult, FatigueAnalysis, DeloadAnalysis, VolumeAnalysis, Pattern } from "./types";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export function extractPatterns(
  aggregations: SegmentAggregation[],
  exerciseImpact: ExerciseImpactResult[],
  fatigueAnalysis: FatigueAnalysis,
  deloadAnalysis: DeloadAnalysis,
  volumeAnalysis: VolumeAnalysis,
): Pattern[] {
  const patterns: Pattern[] = [];

  // 1. High-impact exercise patterns
  const highImpactExercises = exerciseImpact.filter((e) => e.isHighImpact && e.positiveAppearances >= 2);
  for (const exercise of highImpactExercises) {
    const segmentIds = aggregations
      .filter(
        (a) =>
          a.outcome === "positive" &&
          a.exerciseFrequency.some((ef) => ef.exerciseKey === exercise.exerciseKey),
      )
      .map((a) => a.segmentId);

    patterns.push({
      patternId: simpleHash(`exercise_impact_${exercise.exerciseKey}`),
      description: `${exercise.exerciseLabel} consistently appears in your best competition prep blocks`,
      rule: exercise.ruleLabel,
      count: exercise.positiveAppearances,
      segmentIds,
    });
  }

  // 2. Optimal fatigue zone pattern
  if (fatigueAnalysis.optimalZone && fatigueAnalysis.supportingSegments >= 2) {
    const positiveSegs = aggregations
      .filter((a) => a.outcome === "positive")
      .map((a) => a.segmentId);

    patterns.push({
      patternId: simpleHash("optimal_fatigue"),
      description: `Your best results come when intensity stays ${fatigueAnalysis.optimalZone} in weeks 2–4 before competition`,
      rule: fatigueAnalysis.ruleLabel,
      count: fatigueAnalysis.supportingSegments,
      segmentIds: positiveSegs,
    });
  }

  // 3. Deload timing pattern
  if (deloadAnalysis.hasFinding && deloadAnalysis.finding) {
    const { weeksBeforeComp, occurrences } = deloadAnalysis.finding;
    const segsWithDeload = aggregations
      .filter((a) => a.deloadWeekIndex !== null && a.competition !== null)
      .map((a) => a.segmentId);

    patterns.push({
      patternId: simpleHash("deload_timing"),
      description: `You perform best with a deload ~${weeksBeforeComp} week(s) before competition`,
      rule: deloadAnalysis.ruleLabel,
      count: occurrences,
      segmentIds: segsWithDeload,
    });
  }

  // 4. Combined pattern — fatigue zone + deload co-occurring in positive segments
  if (fatigueAnalysis.optimalZone && deloadAnalysis.hasFinding) {
    const combined = aggregations.filter(
      (a) =>
        a.outcome === "positive" &&
        a.deloadWeekIndex !== null &&
        a.weeklyFatigue.slice(1, 4).includes(fatigueAnalysis.optimalZone!),
    );

    if (combined.length >= 2 && deloadAnalysis.finding) {
      patterns.push({
        patternId: simpleHash("combined_fatigue_deload"),
        description: `Your peak performances combine a deload ~${deloadAnalysis.finding.weeksBeforeComp} week(s) out with ${fatigueAnalysis.optimalZone} intensity in the final weeks`,
        rule: `Both signals co-occurred in ${combined.length} positive prep blocks`,
        count: combined.length,
        segmentIds: combined.map((a) => a.segmentId),
      });
    }
  }

  // 5. PB pattern — positive segments where athlete set PBs
  const pbSegments = aggregations.filter(
    (a) =>
      a.outcome === "positive" &&
      (a.pbLiftsAtComp.length > 0 || a.pbLiftsBeatHistory.length > 0),
  );
  if (pbSegments.length >= 2) {
    const allPbLifts = pbSegments.flatMap((a) => [
      ...a.pbLiftsAtComp,
      ...a.pbLiftsBeatHistory,
    ]);
    const liftCounts: Record<string, number> = {};
    for (const l of allPbLifts) liftCounts[l] = (liftCounts[l] ?? 0) + 1;
    const topLift = Object.entries(liftCounts).sort((a, b) => b[1] - a[1])[0];

    patterns.push({
      patternId: simpleHash("pb_positive_segments"),
      description: `Your best prep blocks consistently result in personal bests${topLift ? ` — especially ${topLift[0]}` : ""}`,
      rule: `PBs recorded in ${pbSegments.length} positive prep blocks`,
      count: pbSegments.length,
      segmentIds: pbSegments.map((a) => a.segmentId),
    });
  }

  // 6. Volume taper pattern
  if (volumeAnalysis.hasTaper && volumeAnalysis.supportingSegments >= 2) {
    const peakWeek = volumeAnalysis.peakWeekIndex !== null ? volumeAnalysis.peakWeekIndex + 1 : null;
    const positiveWithComp = aggregations
      .filter((a) => a.outcome === "positive" && a.competition !== null)
      .map((a) => a.segmentId);

    patterns.push({
      patternId: simpleHash("volume_taper"),
      description: `Your best competition preps show a volume taper in the final 2 weeks${peakWeek !== null ? `, peaking ~${peakWeek} week${peakWeek !== 1 ? "s" : ""} out` : ""}`,
      rule: volumeAnalysis.ruleLabel,
      count: volumeAnalysis.supportingSegments,
      segmentIds: positiveWithComp,
    });
  }

  return patterns;
}
