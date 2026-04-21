import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FatigueAnalysis, FatigueZone } from "@/lib/coach/types";

interface CoachFatigueSummaryProps {
  analysis: FatigueAnalysis;
}

const ZONE_STYLES: Record<FatigueZone, string> = {
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  moderate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

const ZONE_LABELS: Record<FatigueZone, string> = {
  low: "Low Intensity",
  moderate: "Moderate Intensity",
  high: "High Intensity",
};

export function CoachFatigueSummary({ analysis }: CoachFatigueSummaryProps) {
  if (!analysis.optimalZone) return null;

  const zones: FatigueZone[] = ["low", "moderate", "high"];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Optimal Intensity Zone</CardTitle>
        <p className="text-xs text-muted-foreground">
          RPE pattern in weeks 2–4 before your best competitions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Optimal zone</span>
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold",
              ZONE_STYLES[analysis.optimalZone],
            )}
          >
            {ZONE_LABELS[analysis.optimalZone]}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {zones.map((zone) => (
            <div
              key={zone}
              className={cn(
                "rounded-md border p-3 text-center",
                analysis.optimalZone === zone ? ZONE_STYLES[zone] : "border-border",
              )}
            >
              <div className="text-lg font-semibold tabular-nums">{analysis.zoneCounts[zone]}</div>
              <div className="text-xs text-muted-foreground capitalize">{zone}</div>
            </div>
          ))}
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info size={12} className="mt-0.5 shrink-0" />
          <span>{analysis.ruleLabel}</span>
        </p>
      </CardContent>
    </Card>
  );
}
