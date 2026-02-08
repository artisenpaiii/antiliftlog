"use client";

import { useState } from "react";
import { Check, Trophy, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { UserMetadata } from "@/lib/types/database";

function parseFloatOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

function numToStr(value: number | null): string {
  return value !== null && value !== undefined ? String(value) : "";
}

interface ProfilePageProps {
  programCount: number;
  competitionCount: number;
  initialMetadata: UserMetadata;
  email: string;
}

const PB_FIELDS = [
  { label: "Squat", gymKey: "pb_squat_gym", compKey: "pb_squat_comp" },
  { label: "Bench", gymKey: "pb_bench_gym", compKey: "pb_bench_comp" },
  { label: "Deadlift", gymKey: "pb_deadlift_gym", compKey: "pb_deadlift_comp" },
] as const;

interface Draft {
  display_name: string;
  pb_squat_gym: string;
  pb_bench_gym: string;
  pb_deadlift_gym: string;
  pb_squat_comp: string;
  pb_bench_comp: string;
  pb_deadlift_comp: string;
}

function buildDraft(meta: UserMetadata): Draft {
  return {
    display_name: meta.display_name,
    pb_squat_gym: numToStr(meta.pb_squat_gym),
    pb_bench_gym: numToStr(meta.pb_bench_gym),
    pb_deadlift_gym: numToStr(meta.pb_deadlift_gym),
    pb_squat_comp: numToStr(meta.pb_squat_comp),
    pb_bench_comp: numToStr(meta.pb_bench_comp),
    pb_deadlift_comp: numToStr(meta.pb_deadlift_comp),
  };
}

function draftsEqual(a: Draft, b: Draft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function ProfilePage({
  programCount,
  competitionCount,
  initialMetadata,
  email,
}: ProfilePageProps) {
  const [draft, setDraft] = useState<Draft>(() => buildDraft(initialMetadata));
  const [originalDraft] = useState<Draft>(() => buildDraft(initialMetadata));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isDirty = !draftsEqual(draft, originalDraft);

  function handleChange(field: keyof Draft, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveMessage(null);

    const metadata: UserMetadata = {
      display_name: draft.display_name.trim(),
      pb_squat_gym: parseFloatOrNull(draft.pb_squat_gym),
      pb_bench_gym: parseFloatOrNull(draft.pb_bench_gym),
      pb_deadlift_gym: parseFloatOrNull(draft.pb_deadlift_gym),
      pb_squat_comp: parseFloatOrNull(draft.pb_squat_comp),
      pb_bench_comp: parseFloatOrNull(draft.pb_bench_comp),
      pb_deadlift_comp: parseFloatOrNull(draft.pb_deadlift_comp),
    };

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ data: metadata });

    setIsSaving(false);

    if (error) {
      setSaveMessage({ type: "error", text: error.message });
      return;
    }

    setSaveMessage({ type: "success", text: "Saved" });

    setTimeout(() => {
      setSaveMessage((prev) => (prev?.type === "success" ? null : prev));
    }, 2000);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences.</p>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display_name">Display name</Label>
          <Input
            id="display_name"
            value={draft.display_name}
            onChange={(e) => handleChange("display_name", e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled className="opacity-60" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border p-6 flex items-center gap-4">
          <div className="rounded-md bg-primary/10 p-2.5">
            <Dumbbell size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{programCount}</p>
            <p className="text-sm text-muted-foreground">Programs</p>
          </div>
        </div>
        <div className="rounded-lg border border-border p-6 flex items-center gap-4">
          <div className="rounded-md bg-primary/10 p-2.5">
            <Trophy size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{competitionCount}</p>
            <p className="text-sm text-muted-foreground">Competitions</p>
          </div>
        </div>
      </div>

      {/* Personal Bests */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Personal Bests</h2>

        {/* Header row */}
        <div className="grid grid-cols-3 gap-4">
          <div />
          <p className="text-sm text-muted-foreground font-medium">Gym (kg)</p>
          <p className="text-sm text-muted-foreground font-medium">Competition (kg)</p>
        </div>

        {/* Lift rows */}
        {PB_FIELDS.map(({ label, gymKey, compKey }) => (
          <div key={label} className="grid grid-cols-3 gap-4 items-center">
            <Label className="text-sm">{label}</Label>
            <Input
              type="number"
              step="0.5"
              value={draft[gymKey]}
              onChange={(e) => handleChange(gymKey, e.target.value)}
              placeholder="—"
            />
            <Input
              type="number"
              step="0.5"
              value={draft[compKey]}
              onChange={(e) => handleChange(compKey, e.target.value)}
              placeholder="—"
            />
          </div>
        ))}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving || !isDirty} size="sm">
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
