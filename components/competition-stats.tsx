"use client";

import { useState, useMemo } from "react";
import { Trophy } from "lucide-react";
import { VolumeChart } from "@/components/volume-chart";
import type { Competition } from "@/lib/types/database";

const LIFTS = ["squat", "bench", "deadlift"] as const;
const ATTEMPTS = [1, 2, 3] as const;

const ALL_METRICS = [
  "Bodyweight",
  "Squat 1",
  "Squat 2",
  "Squat 3",
  "Bench 1",
  "Bench 2",
  "Bench 3",
  "Deadlift 1",
  "Deadlift 2",
  "Deadlift 3",
  "Total",
] as const;

type Metric = (typeof ALL_METRICS)[number];

const DEFAULT_METRICS: Metric[] = [
  "Total",
  "Squat 3",
  "Bench 3",
  "Deadlift 3",
];

function computeTotal(comp: Competition): number | null {
  let total = 0;
  let hasAny = false;

  for (const lift of LIFTS) {
    let bestForLift: number | null = null;
    for (const attempt of ATTEMPTS) {
      const kgKey = `${lift}_${attempt}_kg` as keyof Competition;
      const goodKey = `${lift}_${attempt}_good` as keyof Competition;
      const kg = comp[kgKey] as number | null;
      const good = comp[goodKey] as boolean | null;
      if (kg !== null && good === true) {
        if (bestForLift === null || kg > bestForLift) {
          bestForLift = kg;
        }
      }
    }
    if (bestForLift !== null) {
      total += bestForLift;
      hasAny = true;
    }
  }

  return hasAny ? total : null;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface CompetitionStatsProps {
  competitions: Competition[];
}

export function CompetitionStats({ competitions }: CompetitionStatsProps) {
  const [selectedMetrics, setSelectedMetrics] =
    useState<Metric[]>(DEFAULT_METRICS);

  const sorted = useMemo(
    () =>
      [...competitions].sort(
        (a, b) =>
          new Date(a.meet_date).getTime() - new Date(b.meet_date).getTime(),
      ),
    [competitions],
  );

  const data = useMemo(() => {
    return sorted.map((comp) => {
      const point: Record<string, number | string> = {
        label: formatDate(comp.meet_date),
      };

      if (comp.bodyweight_kg !== null) point["Bodyweight"] = comp.bodyweight_kg;
      if (comp.squat_1_kg !== null) point["Squat 1"] = comp.squat_1_kg;
      if (comp.squat_2_kg !== null) point["Squat 2"] = comp.squat_2_kg;
      if (comp.squat_3_kg !== null) point["Squat 3"] = comp.squat_3_kg;
      if (comp.bench_1_kg !== null) point["Bench 1"] = comp.bench_1_kg;
      if (comp.bench_2_kg !== null) point["Bench 2"] = comp.bench_2_kg;
      if (comp.bench_3_kg !== null) point["Bench 3"] = comp.bench_3_kg;
      if (comp.deadlift_1_kg !== null)
        point["Deadlift 1"] = comp.deadlift_1_kg;
      if (comp.deadlift_2_kg !== null)
        point["Deadlift 2"] = comp.deadlift_2_kg;
      if (comp.deadlift_3_kg !== null)
        point["Deadlift 3"] = comp.deadlift_3_kg;

      const total = computeTotal(comp);
      if (total !== null) point["Total"] = total;

      return point;
    });
  }, [sorted]);

  function toggleMetric(metric: Metric) {
    setSelectedMetrics((prev) =>
      prev.includes(metric)
        ? prev.filter((m) => m !== metric)
        : [...prev, metric],
    );
  }

  if (competitions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
          <Trophy size={16} className="text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          No competitions yet. Add a competition to see stats here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Metrics</h3>
        <div className="flex flex-wrap gap-2">
          {ALL_METRICS.map((metric) => {
            const isSelected = selectedMetrics.includes(metric);
            return (
              <button
                key={metric}
                onClick={() => toggleMetric(metric)}
                className={
                  isSelected
                    ? "rounded-full px-3 py-1 text-xs font-medium bg-primary text-primary-foreground transition-colors"
                    : "rounded-full px-3 py-1 text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
                }
              >
                {metric}
              </button>
            );
          })}
        </div>
      </div>

      <VolumeChart data={data} exercises={selectedMetrics} />
    </div>
  );
}
