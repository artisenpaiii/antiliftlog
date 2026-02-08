"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import { AttemptsTable } from "@/components/attempts-table";
import type { AttemptDraft } from "@/components/attempts-table";
import type { Competition, CompetitionUpdate } from "@/lib/types/database";

const LIFTS = ["squat", "bench", "deadlift"] as const;
const ATTEMPTS = [1, 2, 3] as const;

function parseFloatOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

function parseIntOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

function numToStr(value: number | null): string {
  return value !== null && value !== undefined ? String(value) : "";
}

interface Draft {
  meet_name: string;
  meet_date: string;
  weight_class: string;
  bodyweight_kg: string;
  placing_rank: string;
  notes: string;
  // Attempt fields
  squat_1_kg: string;
  squat_1_good: boolean | null;
  squat_2_kg: string;
  squat_2_good: boolean | null;
  squat_3_kg: string;
  squat_3_good: boolean | null;
  bench_1_kg: string;
  bench_1_good: boolean | null;
  bench_2_kg: string;
  bench_2_good: boolean | null;
  bench_3_kg: string;
  bench_3_good: boolean | null;
  deadlift_1_kg: string;
  deadlift_1_good: boolean | null;
  deadlift_2_kg: string;
  deadlift_2_good: boolean | null;
  deadlift_3_kg: string;
  deadlift_3_good: boolean | null;
}

function buildDraft(comp: Competition): Draft {
  return {
    meet_name: comp.meet_name,
    meet_date: comp.meet_date,
    weight_class: comp.weight_class ?? "",
    bodyweight_kg: numToStr(comp.bodyweight_kg),
    placing_rank: numToStr(comp.placing_rank),
    notes: comp.notes ?? "",
    squat_1_kg: numToStr(comp.squat_1_kg),
    squat_1_good: comp.squat_1_good,
    squat_2_kg: numToStr(comp.squat_2_kg),
    squat_2_good: comp.squat_2_good,
    squat_3_kg: numToStr(comp.squat_3_kg),
    squat_3_good: comp.squat_3_good,
    bench_1_kg: numToStr(comp.bench_1_kg),
    bench_1_good: comp.bench_1_good,
    bench_2_kg: numToStr(comp.bench_2_kg),
    bench_2_good: comp.bench_2_good,
    bench_3_kg: numToStr(comp.bench_3_kg),
    bench_3_good: comp.bench_3_good,
    deadlift_1_kg: numToStr(comp.deadlift_1_kg),
    deadlift_1_good: comp.deadlift_1_good,
    deadlift_2_kg: numToStr(comp.deadlift_2_kg),
    deadlift_2_good: comp.deadlift_2_good,
    deadlift_3_kg: numToStr(comp.deadlift_3_kg),
    deadlift_3_good: comp.deadlift_3_good,
  };
}

function draftsEqual(a: Draft, b: Draft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface CompetitionDetailProps {
  competition: Competition;
  onBack: () => void;
  onCompetitionUpdated: (comp: Competition) => void;
}

export function CompetitionDetail({
  competition,
  onBack,
  onCompetitionUpdated,
}: CompetitionDetailProps) {
  const [draft, setDraft] = useState<Draft>(() => buildDraft(competition));
  const [originalDraft, setOriginalDraft] = useState<Draft>(() => buildDraft(competition));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const newDraft = buildDraft(competition);
    setDraft(newDraft);
    setOriginalDraft(newDraft);
    setSaveMessage(null);
  }, [competition.id]);

  const isDirty = !draftsEqual(draft, originalDraft);

  const computedTotal = useMemo(() => {
    let total = 0;
    let hasAny = false;

    for (const lift of LIFTS) {
      let bestForLift: number | null = null;
      for (const attempt of ATTEMPTS) {
        const kgKey = `${lift}_${attempt}_kg` as keyof Draft;
        const goodKey = `${lift}_${attempt}_good` as keyof Draft;
        const kg = parseFloatOrNull(draft[kgKey] as string);
        const good = draft[goodKey] as boolean | null;
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
  }, [draft]);

  function handleFieldChange(field: keyof Draft, value: string | boolean | null) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function handleAttemptChange(field: string, value: string | boolean | null) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveMessage(null);

    const update: CompetitionUpdate = {
      meet_name: draft.meet_name.trim(),
      meet_date: draft.meet_date,
      weight_class: draft.weight_class.trim() || null,
      bodyweight_kg: parseFloatOrNull(draft.bodyweight_kg),
      placing_rank: parseIntOrNull(draft.placing_rank),
      notes: draft.notes.trim() || null,
      squat_1_kg: parseFloatOrNull(draft.squat_1_kg),
      squat_1_good: draft.squat_1_good,
      squat_2_kg: parseFloatOrNull(draft.squat_2_kg),
      squat_2_good: draft.squat_2_good,
      squat_3_kg: parseFloatOrNull(draft.squat_3_kg),
      squat_3_good: draft.squat_3_good,
      bench_1_kg: parseFloatOrNull(draft.bench_1_kg),
      bench_1_good: draft.bench_1_good,
      bench_2_kg: parseFloatOrNull(draft.bench_2_kg),
      bench_2_good: draft.bench_2_good,
      bench_3_kg: parseFloatOrNull(draft.bench_3_kg),
      bench_3_good: draft.bench_3_good,
      deadlift_1_kg: parseFloatOrNull(draft.deadlift_1_kg),
      deadlift_1_good: draft.deadlift_1_good,
      deadlift_2_kg: parseFloatOrNull(draft.deadlift_2_kg),
      deadlift_2_good: draft.deadlift_2_good,
      deadlift_3_kg: parseFloatOrNull(draft.deadlift_3_kg),
      deadlift_3_good: draft.deadlift_3_good,
    };

    const supabase = createClient();
    const tables = createTables(supabase);
    const { data, error } = await tables.competitions.update(competition.id, update);

    setIsSaving(false);

    if (error || !data) {
      setSaveMessage({ type: "error", text: error ?? "Failed to save" });
      return;
    }

    setOriginalDraft(buildDraft(data));
    setSaveMessage({ type: "success", text: "Saved" });
    onCompetitionUpdated(data);

    setTimeout(() => {
      setSaveMessage((prev) => (prev?.type === "success" ? null : prev));
    }, 2000);
  }

  const attemptDraft: AttemptDraft = {
    squat_1_kg: draft.squat_1_kg,
    squat_1_good: draft.squat_1_good,
    squat_2_kg: draft.squat_2_kg,
    squat_2_good: draft.squat_2_good,
    squat_3_kg: draft.squat_3_kg,
    squat_3_good: draft.squat_3_good,
    bench_1_kg: draft.bench_1_kg,
    bench_1_good: draft.bench_1_good,
    bench_2_kg: draft.bench_2_kg,
    bench_2_good: draft.bench_2_good,
    bench_3_kg: draft.bench_3_kg,
    bench_3_good: draft.bench_3_good,
    deadlift_1_kg: draft.deadlift_1_kg,
    deadlift_1_good: draft.deadlift_1_good,
    deadlift_2_kg: draft.deadlift_2_kg,
    deadlift_2_good: draft.deadlift_2_good,
    deadlift_3_kg: draft.deadlift_3_kg,
    deadlift_3_good: draft.deadlift_3_good,
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors md:hidden"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="meet_name">Meet name</Label>
            <Input
              id="meet_name"
              value={draft.meet_name}
              onChange={(e) => handleFieldChange("meet_name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meet_date">Date</Label>
            <Input
              id="meet_date"
              type="date"
              value={draft.meet_date}
              onChange={(e) => handleFieldChange("meet_date", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight_class">Weight class</Label>
            <Input
              id="weight_class"
              value={draft.weight_class}
              onChange={(e) => handleFieldChange("weight_class", e.target.value)}
              placeholder="e.g. 83kg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bodyweight_kg">Body weight (kg)</Label>
            <Input
              id="bodyweight_kg"
              type="number"
              step="0.1"
              value={draft.bodyweight_kg}
              onChange={(e) => handleFieldChange("bodyweight_kg", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="placing_rank">Placing</Label>
            <Input
              id="placing_rank"
              type="number"
              step="1"
              value={draft.placing_rank}
              onChange={(e) => handleFieldChange("placing_rank", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={3}
            value={draft.notes}
            onChange={(e) => handleFieldChange("notes", e.target.value)}
            placeholder="Competition notes..."
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Attempts</h3>
          <AttemptsTable draft={attemptDraft} onDraftChange={handleAttemptChange} />
        </div>

        {computedTotal !== null && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">{computedTotal} kg</span>
          </div>
        )}
      </div>

      <div className="border-t px-6 py-3 flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={isSaving || !isDirty || !draft.meet_name.trim() || !draft.meet_date}
          size="sm"
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
        {saveMessage && (
          <span
            className={
              saveMessage.type === "success"
                ? "text-sm text-emerald-400 flex items-center gap-1"
                : "text-sm text-destructive"
            }
          >
            {saveMessage.type === "success" && <Check size={14} />}
            {saveMessage.text}
          </span>
        )}
      </div>
    </div>
  );
}
