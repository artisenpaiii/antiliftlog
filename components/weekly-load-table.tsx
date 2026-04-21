"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import type { WeeklyLoadRow } from "@/lib/stats/types";

interface WeeklyLoadTableProps {
  rows: WeeklyLoadRow[];
}

function intensityClass(pct: number | null): string {
  if (pct === null) return "";
  if (pct > 90) return "text-red-400";
  if (pct > 80) return "text-orange-400";
  if (pct > 70) return "text-amber-400";
  return "text-emerald-400";
}

function fmt(value: number | null, decimals = 0): string {
  if (value === null) return "—";
  return value.toFixed(decimals);
}

function fmtVol(volume: number): string {
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k`;
  return String(Math.round(volume));
}

const LIFTS = ["squat", "bench", "deadlift"] as const;

export function WeeklyLoadTable({ rows }: WeeklyLoadTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">No weekly load data available.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Week</th>
            <th className="px-3 py-2.5 text-center font-medium text-muted-foreground" colSpan={5}>Squat</th>
            <th className="px-3 py-2.5 text-center font-medium text-muted-foreground border-l border-border/50" colSpan={5}>Bench</th>
            <th className="px-3 py-2.5 text-center font-medium text-muted-foreground border-l border-border/50" colSpan={5}>Deadlift</th>
          </tr>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-3 py-2 text-left"></th>
            {LIFTS.map((lift) => (
              <Fragment key={lift}>
                <th className={cn("px-2 py-2 font-normal text-right whitespace-nowrap", lift !== "squat" && "border-l border-border/50")}>Sets</th>
                <th className="px-2 py-2 font-normal text-right whitespace-nowrap">Reps</th>
                <th className="px-2 py-2 font-normal text-right whitespace-nowrap">RPE</th>
                <th className="px-2 py-2 font-normal text-right whitespace-nowrap">Peak</th>
                <th className="px-2 py-2 font-normal text-right whitespace-nowrap">Vol</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.label} className={cn("border-b border-border/50 last:border-b-0", i % 2 === 0 ? "" : "bg-muted/10")}>
              <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{row.label}</td>
              {LIFTS.map((lift) => {
                const d = row[lift];
                return (
                  <Fragment key={lift}>
                    <td className={cn("px-2 py-2 text-right tabular-nums", lift !== "squat" && "border-l border-border/50")}>
                      {d.sets > 0 ? d.sets : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {d.totalReps > 0 ? d.totalReps : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                      {fmt(d.avgRpe, 1)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {d.peakWeight !== null ? `${d.peakWeight}` : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className={cn("px-2 py-2 text-right tabular-nums", intensityClass(d.avgIntensityPct))}>
                      {d.volume > 0 ? fmtVol(d.volume) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                  </Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
