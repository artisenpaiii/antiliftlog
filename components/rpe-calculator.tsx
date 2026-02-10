"use client";

import { useState, useMemo } from "react";
import { Check, Pencil } from "lucide-react";
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
import {
  getRpePercentage,
  roundToIncrement,
  getNearbyEntries,
  RPE_VALUES,
  REP_VALUES,
} from "@/lib/rpe-chart";
import type { UserMetadata } from "@/lib/types/database";
import type { ExerciseOption } from "@/lib/types/rpe";

const KG_TO_LB = 2.20462;

const EXERCISE_METADATA_KEY: Record<string, keyof UserMetadata> = {
  squat: "pb_squat_gym",
  bench: "pb_bench_gym",
  deadlift: "pb_deadlift_gym",
};

interface RpeCalculatorProps {
  initialMetadata: UserMetadata;
}

export function RpeCalculator({ initialMetadata }: RpeCalculatorProps) {
  const [exercise, setExercise] = useState<ExerciseOption>("squat");
  const [oneRmValues, setOneRmValues] = useState<Record<string, number | null>>({
    squat: initialMetadata.pb_squat_gym,
    bench: initialMetadata.pb_bench_gym,
    deadlift: initialMetadata.pb_deadlift_gym,
  });
  const [customOneRm, setCustomOneRm] = useState("");
  const [reps, setReps] = useState(5);
  const [rpe, setRpe] = useState(8);
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [increment, setIncrement] = useState(2.5);
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const convertWeight = (kg: number): number => {
    return unit === "lb" ? kg * KG_TO_LB : kg;
  };

  const displayIncrement = unit === "lb" ? 5 : increment;

  const activeOneRmKg = exercise === "custom"
    ? (parseFloat(customOneRm) || null)
    : oneRmValues[exercise];

  const activeOneRm = activeOneRmKg !== null ? convertWeight(activeOneRmKg) : null;

  const result = useMemo(() => {
    if (activeOneRm === null) return null;
    const pct = getRpePercentage(reps, rpe);
    if (pct === null) return null;

    const weight = roundToIncrement(activeOneRm * pct, displayIncrement);
    const nearbyEntries = getNearbyEntries(reps, rpe, activeOneRm, displayIncrement);

    return { weight, percentage: pct, nearbyEntries };
  }, [activeOneRm, reps, rpe, displayIncrement]);

  function handleUnitToggle(newUnit: "kg" | "lb") {
    if (newUnit === unit) return;
    setUnit(newUnit);
    if (newUnit === "lb") {
      setIncrement(2.5);
    } else {
      setIncrement(2.5);
    }
  }

  async function handleSaveOneRm(exerciseKey: string, valueKg: number) {
    const metaKey = EXERCISE_METADATA_KEY[exerciseKey];
    if (!metaKey) return;

    setIsSaving(true);
    setSaveMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { [metaKey]: valueKg },
    });

    setIsSaving(false);

    if (error) {
      setSaveMessage({ type: "error", text: error.message });
      return;
    }

    setOneRmValues((prev) => ({ ...prev, [exerciseKey]: valueKg }));
    setEditingExercise(null);
    setSaveMessage({ type: "success", text: "Saved" });
    setTimeout(() => {
      setSaveMessage((prev) => (prev?.type === "success" ? null : prev));
    }, 2000);
  }

  function startEdit(exerciseKey: string) {
    const currentKg = oneRmValues[exerciseKey];
    const displayVal = currentKg !== null ? convertWeight(currentKg) : "";
    setEditValue(String(displayVal ? Math.round(displayVal * 10) / 10 : ""));
    setEditingExercise(exerciseKey);
  }

  function confirmEdit(exerciseKey: string) {
    const parsed = parseFloat(editValue);
    if (isNaN(parsed) || parsed <= 0) return;
    const valueKg = unit === "lb" ? parsed / KG_TO_LB : parsed;
    handleSaveOneRm(exerciseKey, Math.round(valueKg * 10) / 10);
  }

  const hasOneRm = exercise === "custom"
    ? customOneRm !== "" && !isNaN(parseFloat(customOneRm))
    : oneRmValues[exercise] !== null;

  return (
    <div className="flex flex-col gap-6">
      {/* Settings row */}
      <div className="flex items-end gap-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Unit</Label>
          <div className="flex rounded-lg bg-muted p-1">
            <button
              onClick={() => handleUnitToggle("kg")}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition-colors",
                unit === "kg"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              kg
            </button>
            <button
              onClick={() => handleUnitToggle("lb")}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition-colors",
                unit === "lb"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              lb
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="increment" className="text-xs text-muted-foreground">Increment ({unit})</Label>
          <Input
            id="increment"
            type="number"
            step="0.5"
            min="0.5"
            value={displayIncrement}
            onChange={(e) => setIncrement(parseFloat(e.target.value) || 2.5)}
            className="w-20"
          />
        </div>
      </div>

      {/* Exercise select */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Exercise</Label>
        <Select value={exercise} onValueChange={(v) => setExercise(v as ExerciseOption)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="squat">Squat</SelectItem>
            <SelectItem value="bench">Bench</SelectItem>
            <SelectItem value="deadlift">Deadlift</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 1RM section */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">1RM</Label>
        {exercise === "custom" ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.5"
              min="0"
              placeholder={`Enter 1RM (${unit})`}
              value={customOneRm}
              onChange={(e) => setCustomOneRm(e.target.value)}
              className="w-40"
            />
            <span className="text-sm text-muted-foreground">{unit}</span>
          </div>
        ) : editingExercise === exercise ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.5"
              min="0"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-40"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmEdit(exercise);
                if (e.key === "Escape") setEditingExercise(null);
              }}
            />
            <span className="text-sm text-muted-foreground">{unit}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => confirmEdit(exercise)}
              disabled={isSaving}
            >
              {isSaving ? "..." : <Check size={16} />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingExercise(null)}
            >
              Cancel
            </Button>
          </div>
        ) : oneRmValues[exercise] !== null ? (
          <div className="flex items-center gap-2">
            <span className="text-sm">
              Your 1RM: <span className="font-semibold">{Math.round(convertWeight(oneRmValues[exercise]!) * 10) / 10}</span> {unit}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => startEdit(exercise)}
              className="text-muted-foreground"
            >
              <Pencil size={14} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.5"
              min="0"
              placeholder={`Enter 1RM (${unit})`}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-40"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const parsed = parseFloat(editValue);
                  if (!isNaN(parsed) && parsed > 0) {
                    const valueKg = unit === "lb" ? parsed / KG_TO_LB : parsed;
                    handleSaveOneRm(exercise, Math.round(valueKg * 10) / 10);
                  }
                }
              }}
            />
            <span className="text-sm text-muted-foreground">{unit}</span>
            <Button
              size="sm"
              onClick={() => {
                const parsed = parseFloat(editValue);
                if (!isNaN(parsed) && parsed > 0) {
                  const valueKg = unit === "lb" ? parsed / KG_TO_LB : parsed;
                  handleSaveOneRm(exercise, Math.round(valueKg * 10) / 10);
                }
              }}
              disabled={isSaving || !editValue}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
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

      {/* Reps + RPE selectors */}
      <div className="grid grid-cols-2 gap-4">
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
      {!hasOneRm && exercise !== "custom" && (
        <p className="text-sm text-muted-foreground">
          Set your 1RM above to calculate working weights.
        </p>
      )}
      {!hasOneRm && exercise === "custom" && (
        <p className="text-sm text-muted-foreground">
          Enter a 1RM to calculate.
        </p>
      )}

      {hasOneRm && !result && (
        <p className="text-sm text-muted-foreground">
          No data for this combination.
        </p>
      )}

      {result && (
        <>
          {/* Main result card */}
          <div className="rounded-lg border border-border p-6 space-y-1">
            <p className="text-3xl font-semibold">
              {result.weight} <span className="text-lg font-normal text-muted-foreground">{unit}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {(result.percentage * 100).toFixed(1)}% of {activeOneRm !== null ? Math.round(activeOneRm * 10) / 10 : "—"} {unit} 1RM
            </p>
          </div>

          {/* Nearby RPE table */}
          {result.nearbyEntries.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Nearby RPE</Label>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">RPE</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">%1RM</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">Weight ({unit})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.nearbyEntries.map((entry) => (
                      <tr
                        key={entry.rpe}
                        className={cn(
                          "border-b border-border last:border-b-0",
                          entry.rpe === rpe && "bg-accent"
                        )}
                      >
                        <td className="px-4 py-2">{entry.rpe}</td>
                        <td className="px-4 py-2">{(entry.percentage * 100).toFixed(1)}%</td>
                        <td className="px-4 py-2 text-right font-medium">{entry.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
