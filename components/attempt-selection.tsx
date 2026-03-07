"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { suggestAllAttempts } from "@/lib/attempt-selection";
import type { AttemptSuggestion, AttemptScenario } from "@/lib/attempt-selection";
import type { UserMetadata } from "@/lib/types/database";

interface AttemptSelectionProps {
  initialMetadata: UserMetadata;
}

const SCENARIO_LABELS: Record<AttemptScenario, string> = {
  conservative: "Conservative",
  standard: "Standard",
  aggressive: "Aggressive",
};

const SCENARIO_DESCRIPTIONS: Record<AttemptScenario, string> = {
  conservative: "Safe openers, modest goal",
  standard: "Planned training max on 2nd",
  aggressive: "PR on 3rd if 2nd moves well",
};

function AttemptCell({ weight, isOpener, className }: { weight: number; isOpener?: boolean; className?: string }) {
  return (
    <td className={cn("px-3 py-2.5 text-right tabular-nums text-sm", isOpener && "text-muted-foreground", className)}>
      {weight} <span className="text-xs text-muted-foreground">kg</span>
    </td>
  );
}

export function AttemptSelection({ initialMetadata }: AttemptSelectionProps) {
  const [squat, setSquat] = useState(initialMetadata.pb_squat_gym !== null ? String(initialMetadata.pb_squat_gym) : "");
  const [bench, setBench] = useState(initialMetadata.pb_bench_gym !== null ? String(initialMetadata.pb_bench_gym) : "");
  const [deadlift, setDeadlift] = useState(
    initialMetadata.pb_deadlift_gym !== null ? String(initialMetadata.pb_deadlift_gym) : "",
  );
  const [recommended, setRecommended] = useState<AttemptScenario>("standard");

  const suggestions = useMemo<AttemptSuggestion[] | null>(() => {
    const s = parseFloat(squat);
    const b = parseFloat(bench);
    const d = parseFloat(deadlift);
    if (isNaN(s) || isNaN(b) || isNaN(d) || s <= 0 || b <= 0 || d <= 0) return null;
    return suggestAllAttempts({ squat: s, bench: b, deadlift: d });
  }, [squat, bench, deadlift]);

  const hasInputs = squat && bench && deadlift;

  return (
    <div className="flex flex-col gap-6">
      {/* Training max inputs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tm-squat" className="text-xs text-muted-foreground">Squat TM (kg)</Label>
          <Input
            id="tm-squat"
            type="number"
            step="0.5"
            min="0"
            placeholder="e.g. 220"
            value={squat}
            onChange={(e) => setSquat(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tm-bench" className="text-xs text-muted-foreground">Bench TM (kg)</Label>
          <Input
            id="tm-bench"
            type="number"
            step="0.5"
            min="0"
            placeholder="e.g. 150"
            value={bench}
            onChange={(e) => setBench(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tm-deadlift" className="text-xs text-muted-foreground">Deadlift TM (kg)</Label>
          <Input
            id="tm-deadlift"
            type="number"
            step="0.5"
            min="0"
            placeholder="e.g. 270"
            value={deadlift}
            onChange={(e) => setDeadlift(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground -mt-2">
        Training max (TM) = your current best single, not necessarily an all-time PR. Used to calculate attempt percentages.
      </p>

      {!hasInputs && (
        <p className="text-sm text-muted-foreground">Enter your training max for each lift to generate attempt suggestions.</p>
      )}

      {hasInputs && !suggestions && (
        <p className="text-sm text-muted-foreground">Enter valid positive values for all three lifts.</p>
      )}

      {suggestions && (
        <>
          {/* Scenario selector */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Recommended scenario</Label>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.scenario}
                  onClick={() => setRecommended(s.scenario)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    recommended === s.scenario
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {SCENARIO_LABELS[s.scenario]}
                </button>
              ))}
            </div>
          </div>

          {/* Attempt table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Scenario</th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground" colSpan={3}>Squat</th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground border-l border-border/50" colSpan={3}>Bench</th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground border-l border-border/50" colSpan={3}>Deadlift</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground border-l border-border/50">Total</th>
                </tr>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2 text-right font-normal">1st</th>
                  <th className="px-3 py-2 text-right font-normal">2nd</th>
                  <th className="px-3 py-2 text-right font-normal">3rd</th>
                  <th className="px-3 py-2 text-right font-normal border-l border-border/50">1st</th>
                  <th className="px-3 py-2 text-right font-normal">2nd</th>
                  <th className="px-3 py-2 text-right font-normal">3rd</th>
                  <th className="px-3 py-2 text-right font-normal border-l border-border/50">1st</th>
                  <th className="px-3 py-2 text-right font-normal">2nd</th>
                  <th className="px-3 py-2 text-right font-normal">3rd</th>
                  <th className="px-3 py-2 border-l border-border/50"></th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s) => {
                  const isRec = s.scenario === recommended;
                  return (
                    <tr
                      key={s.scenario}
                      className={cn(
                        "border-b border-border/50 last:border-b-0 transition-colors cursor-pointer",
                        isRec ? "bg-primary/8" : "hover:bg-muted/20",
                      )}
                      onClick={() => setRecommended(s.scenario)}
                    >
                      <td className="px-3 py-2.5">
                        <div>
                          <span className={cn("text-sm font-medium", isRec && "text-primary")}>
                            {SCENARIO_LABELS[s.scenario]}
                          </span>
                          {isRec && (
                            <span className="ml-2 text-xs text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">
                              selected
                            </span>
                          )}
                          <p className="text-xs text-muted-foreground">{SCENARIO_DESCRIPTIONS[s.scenario]}</p>
                        </div>
                      </td>
                      <AttemptCell weight={s.squat.opener} isOpener />
                      <AttemptCell weight={s.squat.second} />
                      <AttemptCell weight={s.squat.third} />
                      <AttemptCell weight={s.bench.opener} isOpener className="border-l border-border/50" />
                      <AttemptCell weight={s.bench.second} />
                      <AttemptCell weight={s.bench.third} />
                      <AttemptCell weight={s.deadlift.opener} isOpener className="border-l border-border/50" />
                      <AttemptCell weight={s.deadlift.second} />
                      <AttemptCell weight={s.deadlift.third} />
                      <td className="px-3 py-2.5 text-right border-l border-border/50">
                        <span className={cn("text-sm font-semibold", isRec && "text-primary")}>
                          {s.projectedTotal}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">kg</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Coaching notes */}
          <div className="rounded-lg bg-muted/30 border border-border/50 px-4 py-3 text-xs text-muted-foreground space-y-1">
            <p><span className="text-foreground font-medium">Opener (1st):</span> Something you could triple. Walk-in confidence — never miss.</p>
            <p><span className="text-foreground font-medium">2nd attempt:</span> Your planned training max. This is your target on a competition day.</p>
            <p><span className="text-foreground font-medium">3rd attempt:</span> Only go here if the 2nd moved well. PR territory. Decide in real time.</p>
          </div>
        </>
      )}
    </div>
  );
}
