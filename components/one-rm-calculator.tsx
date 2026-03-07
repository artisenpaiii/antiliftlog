"use client";

import { useState, useMemo } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getRpePercentage, roundToIncrement, RPE_VALUES, REP_VALUES } from "@/lib/rpe-chart";
import type { UserMetadata } from "@/lib/types/database";

const KG_TO_LB = 2.20462;

type ExerciseKey = "squat" | "bench" | "deadlift";

const EXERCISE_LABELS: Record<ExerciseKey, string> = {
  squat: "Squat",
  bench: "Bench",
  deadlift: "Deadlift",
};

const EXERCISE_METADATA_KEY: Record<ExerciseKey, keyof UserMetadata> = {
  squat: "pb_squat_gym",
  bench: "pb_bench_gym",
  deadlift: "pb_deadlift_gym",
};

interface OneRmCalculatorProps {
  initialMetadata: UserMetadata;
}

export function OneRmCalculator({ initialMetadata }: OneRmCalculatorProps) {
  const [exercise, setExercise] = useState<ExerciseKey>("squat");
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState(5);
  const [rpe, setRpe] = useState(8);
  const [prValues, setPrValues] = useState<Record<ExerciseKey, number | null>>({
    squat: initialMetadata.pb_squat_gym,
    bench: initialMetadata.pb_bench_gym,
    deadlift: initialMetadata.pb_deadlift_gym,
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const parsedWeight = parseFloat(weight);
  const hasWeight = !isNaN(parsedWeight) && parsedWeight > 0;

  const { oneRmKg, oneRmDisplay } = useMemo(() => {
    if (!hasWeight) return { oneRmKg: null, oneRmDisplay: null };
    const pct = getRpePercentage(reps, rpe);
    if (!pct) return { oneRmKg: null, oneRmDisplay: null };
    const weightKg = unit === "lb" ? parsedWeight / KG_TO_LB : parsedWeight;
    const kg = weightKg / pct;
    const display = unit === "lb" ? kg * KG_TO_LB : kg;
    return { oneRmKg: kg, oneRmDisplay: roundToIncrement(display, 0.5) };
  }, [hasWeight, parsedWeight, reps, rpe, unit]);

  const currentPrKg = prValues[exercise];
  const currentPrDisplay = currentPrKg !== null
    ? roundToIncrement(unit === "lb" ? currentPrKg * KG_TO_LB : currentPrKg, 0.5)
    : null;

  const deltaDisplay = oneRmDisplay !== null && currentPrDisplay !== null
    ? Math.round((oneRmDisplay - currentPrDisplay) * 10) / 10
    : null;

  const isNewPr = oneRmKg !== null && (currentPrKg === null || oneRmKg > currentPrKg);

  async function handleSavePr() {
    if (oneRmKg === null) return;
    setSaving(true);
    setSaveMessage(null);

    const metaKey = EXERCISE_METADATA_KEY[exercise];
    const rounded = Math.round(oneRmKg * 10) / 10;

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { [metaKey]: rounded },
    });

    setSaving(false);

    if (error) {
      setSaveMessage({ type: "error", text: error.message });
      return;
    }

    setPrValues((prev) => ({ ...prev, [exercise]: rounded }));
    setSaveMessage({ type: "success", text: "PR saved!" });
    setTimeout(() => {
      setSaveMessage((prev) => (prev?.type === "success" ? null : prev));
    }, 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Unit toggle */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Unit</Label>
        <div className="flex rounded-lg bg-muted p-1 w-fit">
          {(["kg", "lb"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition-colors",
                unit === u
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise selector */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Exercise</Label>
        <div className="flex rounded-lg bg-muted p-1 w-fit gap-1">
          {(Object.keys(EXERCISE_LABELS) as ExerciseKey[]).map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setExercise(ex);
                setSaveMessage(null);
              }}
              className={cn(
                "px-4 py-1.5 text-sm rounded-md transition-colors",
                exercise === ex
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {EXERCISE_LABELS[ex]}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs: weight, reps, RPE */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lifted-weight" className="text-xs text-muted-foreground">
            Weight ({unit})
          </Label>
          <Input
            id="lifted-weight"
            type="number"
            step="0.5"
            min="0"
            placeholder="e.g. 150"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Reps</Label>
          <Select value={String(reps)} onValueChange={(v) => setReps(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REP_VALUES.map((r) => (
                <SelectItem key={r} value={String(r)}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">RPE</Label>
          <Select value={String(rpe)} onValueChange={(v) => setRpe(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RPE_VALUES.map((r) => (
                <SelectItem key={r} value={String(r)}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Result */}
      {!hasWeight && (
        <p className="text-sm text-muted-foreground">Enter the weight you lifted to predict your 1RM.</p>
      )}

      {hasWeight && oneRmDisplay === null && (
        <p className="text-sm text-muted-foreground">No data for this rep/RPE combination.</p>
      )}

      {oneRmDisplay !== null && (
        <div className="rounded-lg border border-border p-6 space-y-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Predicted 1RM</p>
            <p className="text-3xl font-semibold">
              {oneRmDisplay} <span className="text-lg font-normal text-muted-foreground">{unit}</span>
            </p>
          </div>

          {/* PR comparison */}
          <div className="border-t border-border pt-4 space-y-3">
            {currentPrDisplay !== null ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Current {EXERCISE_LABELS[exercise]} PR:{" "}
                  <span className="text-foreground font-medium">{currentPrDisplay} {unit}</span>
                </span>
                {deltaDisplay !== null && (
                  <span
                    className={cn(
                      "font-medium",
                      deltaDisplay > 0 ? "text-emerald-400" : deltaDisplay < 0 ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {deltaDisplay > 0 ? "+" : ""}{deltaDisplay} {unit}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No {EXERCISE_LABELS[exercise]} PR set.</p>
            )}

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant={isNewPr ? "default" : "outline"}
                onClick={handleSavePr}
                disabled={saving}
              >
                {saving ? "Saving..." : isNewPr ? "Save as PR" : "Override PR"}
              </Button>
              {saveMessage && (
                <span
                  className={cn(
                    "text-xs flex items-center gap-1",
                    saveMessage.type === "success" ? "text-emerald-400" : "text-destructive"
                  )}
                >
                  {saveMessage.type === "success" && <Check size={12} />}
                  {saveMessage.text}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
