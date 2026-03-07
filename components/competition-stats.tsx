"use client";

import { useState, useMemo } from "react";
import { Trophy } from "lucide-react";
import { VolumeChart, type WeekDataPoint } from "@/components/volume-chart";
import { calculateIPFGL, getGLBenchmark } from "@/lib/ipf-gl";
import { cn } from "@/lib/utils";
import type { Competition } from "@/lib/types/database";
import type { Sex, Equipment } from "@/lib/ipf-gl";

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
  "IPF GL",
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
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(DEFAULT_METRICS);
  const [sex, setSex] = useState<Sex>("male");
  const [equipment, setEquipment] = useState<Equipment>("raw");

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
      const point: WeekDataPoint = {
        label: formatDate(comp.meet_date),
      };

      if (comp.bodyweight_kg !== null) point["Bodyweight"] = comp.bodyweight_kg;
      if (comp.squat_1_kg !== null) point["Squat 1"] = comp.squat_1_kg;
      if (comp.squat_2_kg !== null) point["Squat 2"] = comp.squat_2_kg;
      if (comp.squat_3_kg !== null) point["Squat 3"] = comp.squat_3_kg;
      if (comp.bench_1_kg !== null) point["Bench 1"] = comp.bench_1_kg;
      if (comp.bench_2_kg !== null) point["Bench 2"] = comp.bench_2_kg;
      if (comp.bench_3_kg !== null) point["Bench 3"] = comp.bench_3_kg;
      if (comp.deadlift_1_kg !== null) point["Deadlift 1"] = comp.deadlift_1_kg;
      if (comp.deadlift_2_kg !== null) point["Deadlift 2"] = comp.deadlift_2_kg;
      if (comp.deadlift_3_kg !== null) point["Deadlift 3"] = comp.deadlift_3_kg;

      const total = computeTotal(comp);
      if (total !== null) {
        point["Total"] = total;
        if (comp.bodyweight_kg !== null) {
          const gl = calculateIPFGL(total, comp.bodyweight_kg, sex, equipment);
          if (gl !== null) point["IPF GL"] = Math.round(gl * 100) / 100;
        }
      }

      return point;
    });
  }, [sorted, sex, equipment]);

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
      {/* Sex / Equipment (needed for IPF GL) */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Sex (for IPF GL)</p>
          <div className="flex rounded-lg bg-muted p-1 w-fit">
            {(["male", "female"] as Sex[]).map((s) => (
              <button
                key={s}
                onClick={() => setSex(s)}
                className={cn(
                  "px-3 py-1 text-xs rounded-md transition-colors capitalize",
                  sex === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Equipment</p>
          <div className="flex rounded-lg bg-muted p-1 w-fit">
            {(["raw", "equipped"] as Equipment[]).map((e) => (
              <button
                key={e}
                onClick={() => setEquipment(e)}
                className={cn(
                  "px-3 py-1 text-xs rounded-md transition-colors capitalize",
                  equipment === e ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

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

      {/* Competition history table */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">History</h3>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Meet</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">BW</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Squat</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Bench</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Deadlift</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">GL</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((comp) => {
                const total = computeTotal(comp);
                const gl = total !== null && comp.bodyweight_kg !== null
                  ? calculateIPFGL(total, comp.bodyweight_kg, sex, equipment)
                  : null;
                const benchmark = gl !== null ? getGLBenchmark(gl) : null;
                const bestSquat = [comp.squat_1_kg, comp.squat_2_kg, comp.squat_3_kg]
                  .filter((v): v is number => v !== null)
                  .reduce((best, v, i) => {
                    const goodKey = `squat_${i + 1}_good` as keyof Competition;
                    return comp[goodKey] === true && v > (best ?? 0) ? v : best;
                  }, null as number | null);
                const bestBench = [comp.bench_1_kg, comp.bench_2_kg, comp.bench_3_kg]
                  .filter((v): v is number => v !== null)
                  .reduce((best, v, i) => {
                    const goodKey = `bench_${i + 1}_good` as keyof Competition;
                    return comp[goodKey] === true && v > (best ?? 0) ? v : best;
                  }, null as number | null);
                const bestDead = [comp.deadlift_1_kg, comp.deadlift_2_kg, comp.deadlift_3_kg]
                  .filter((v): v is number => v !== null)
                  .reduce((best, v, i) => {
                    const goodKey = `deadlift_${i + 1}_good` as keyof Competition;
                    return comp[goodKey] === true && v > (best ?? 0) ? v : best;
                  }, null as number | null);

                return (
                  <tr key={comp.id} className="border-b border-border/50 last:border-b-0">
                    <td className="px-3 py-2.5 font-medium max-w-[160px] truncate">{comp.meet_name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(comp.meet_date)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                      {comp.bodyweight_kg !== null ? `${comp.bodyweight_kg}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {bestSquat !== null ? bestSquat : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {bestBench !== null ? bestBench : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {bestDead !== null ? bestDead : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                      {total !== null ? total : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {gl !== null ? (
                        <span className={cn("font-medium", benchmark?.color)}>
                          {gl.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
