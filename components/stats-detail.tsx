"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Settings, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VolumeChart } from "@/components/volume-chart";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import type {
  Program,
  Block,
  Week,
  Day,
  DayColumn,
  DayRow,
  StatsSettings,
} from "@/lib/types/database";

interface StatsDetailProps {
  program: Program;
  onBack: () => void;
}

interface ProgramHierarchy {
  blocks: Array<{
    block: Block;
    weeks: Array<{
      week: Week;
      days: Array<{
        day: Day;
        columns: DayColumn[];
        rows: DayRow[];
      }>;
    }>;
  }>;
}

interface WeekDataPoint {
  label: string;
  [exerciseName: string]: number | string;
}

function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.,-]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function computeVolumeData(
  hierarchy: ProgramHierarchy,
  settings: StatsSettings,
): { dataPoints: WeekDataPoint[]; exercises: string[] } {
  const exerciseVolumes: Record<string, Record<string, number>> = {};
  const weekLabels: string[] = [];

  for (const blockData of hierarchy.blocks) {
    for (const weekData of blockData.weeks) {
      const label = `B${blockData.block.order + 1}W${weekData.week.week_number}`;
      weekLabels.push(label);

      for (const dayData of weekData.days) {
        const exerciseCol = dayData.columns.find(
          (c) => c.label === settings.exercise_label,
        );
        const setsCol = dayData.columns.find(
          (c) => c.label === settings.sets_label,
        );
        const repsCol = dayData.columns.find(
          (c) => c.label === settings.reps_label,
        );
        const weightCol = dayData.columns.find(
          (c) => c.label === settings.weight_label,
        );

        if (!exerciseCol || !setsCol || !repsCol || !weightCol) continue;

        for (const row of dayData.rows) {
          const exercise = row.cells[exerciseCol.id]?.trim();
          if (!exercise) continue;

          const sets = parseNumber(row.cells[setsCol.id]);
          const reps = parseNumber(row.cells[repsCol.id]);
          const weight = parseNumber(row.cells[weightCol.id]);
          const volume = sets * reps * weight;

          if (volume <= 0) continue;

          if (!exerciseVolumes[exercise]) {
            exerciseVolumes[exercise] = {};
          }
          exerciseVolumes[exercise][label] =
            (exerciseVolumes[exercise][label] ?? 0) + volume;
        }
      }
    }
  }

  const exercises = Object.keys(exerciseVolumes).sort();

  const dataPoints: WeekDataPoint[] = weekLabels.map((label) => {
    const point: WeekDataPoint = { label };
    for (const exercise of exercises) {
      const vol = exerciseVolumes[exercise][label];
      if (vol !== undefined) {
        point[exercise] = vol;
      }
    }
    return point;
  });

  return { dataPoints, exercises };
}

export function StatsDetail({ program, onBack }: StatsDetailProps) {
  const [settings, setSettings] = useState<StatsSettings | null>(null);
  const [hierarchy, setHierarchy] = useState<ProgramHierarchy | null>(null);
  const [columnLabels, setColumnLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  // Settings draft
  const [draftExercise, setDraftExercise] = useState("");
  const [draftSets, setDraftSets] = useState("");
  const [draftReps, setDraftReps] = useState("");
  const [draftWeight, setDraftWeight] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setSaveMessage(null);

    const supabase = createClient();
    const tables = createTables(supabase);

    // Fetch settings and blocks in parallel
    const [settingsResult, blocksResult] = await Promise.all([
      tables.statsSettings.findByProgramId(program.id),
      tables.blocks.findByProgramId(program.id),
    ]);

    const fetchedSettings = settingsResult.data ?? null;
    const blocks = blocksResult.data ?? [];

    // Build hierarchy
    const blockDataArr: ProgramHierarchy["blocks"] = [];
    const allLabels = new Set<string>();

    for (const block of blocks) {
      const { data: weeks } = await tables.weeks.findByBlockId(block.id);
      const weekDataArr: ProgramHierarchy["blocks"][number]["weeks"] = [];

      for (const week of weeks ?? []) {
        const { data: days } = await tables.days.findByWeekId(week.id);
        const dayDataArr: ProgramHierarchy["blocks"][number]["weeks"][number]["days"] =
          [];

        const dayFetches = (days ?? []).map(async (day) => {
          const [colResult, rowResult] = await Promise.all([
            tables.dayColumns.findByDayId(day.id),
            tables.dayRows.findByDayId(day.id),
          ]);
          const columns = colResult.data ?? [];
          const rows = rowResult.data ?? [];
          columns.forEach((c) => allLabels.add(c.label));
          return { day, columns, rows };
        });

        const resolvedDays = await Promise.all(dayFetches);
        dayDataArr.push(...resolvedDays);
        weekDataArr.push({ week, days: dayDataArr });
      }

      blockDataArr.push({ block, weeks: weekDataArr });
    }

    const builtHierarchy: ProgramHierarchy = { blocks: blockDataArr };
    const labels = Array.from(allLabels).sort();

    setSettings(fetchedSettings);
    setHierarchy(builtHierarchy);
    setColumnLabels(labels);

    if (fetchedSettings) {
      setDraftExercise(fetchedSettings.exercise_label);
      setDraftSets(fetchedSettings.sets_label);
      setDraftReps(fetchedSettings.reps_label);
      setDraftWeight(fetchedSettings.weight_label);
      setSettingsOpen(false);
    } else {
      setDraftExercise("");
      setDraftSets("");
      setDraftReps("");
      setDraftWeight("");
      setSettingsOpen(true);
    }

    setLoading(false);
  }, [program.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute chart data when settings or hierarchy changes
  const { dataPoints, allExercises } = useMemo(() => {
    if (!hierarchy || !settings) {
      return { dataPoints: [], allExercises: [] };
    }
    const result = computeVolumeData(hierarchy, settings);
    return { dataPoints: result.dataPoints, allExercises: result.exercises };
  }, [hierarchy, settings]);

  // Reset selected exercises when allExercises changes
  useEffect(() => {
    setSelectedExercises(allExercises.slice(0, 5));
  }, [allExercises]);

  function toggleExercise(exercise: string) {
    setSelectedExercises((prev) =>
      prev.includes(exercise)
        ? prev.filter((e) => e !== exercise)
        : [...prev, exercise],
    );
  }

  async function handleSaveSettings() {
    if (!draftExercise || !draftSets || !draftReps || !draftWeight) return;

    setIsSaving(true);
    setSaveMessage(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaveMessage({ type: "error", text: "Not authenticated" });
      setIsSaving(false);
      return;
    }

    const tables = createTables(supabase);
    const { data, error } = await tables.statsSettings.upsertByProgramId(
      program.id,
      {
        program_id: program.id,
        created_by: user.id,
        exercise_label: draftExercise,
        sets_label: draftSets,
        reps_label: draftReps,
        weight_label: draftWeight,
      },
    );

    setIsSaving(false);

    if (error || !data) {
      setSaveMessage({ type: "error", text: error ?? "Failed to save" });
      return;
    }

    setSettings(data);
    setSettingsOpen(false);
    setSaveMessage({ type: "success", text: "Saved" });

    setTimeout(() => {
      setSaveMessage((prev) => (prev?.type === "success" ? null : prev));
    }, 2000);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasSettings = settings !== null;
  const canSaveSettings =
    draftExercise && draftSets && draftReps && draftWeight;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors md:hidden"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <h2 className="text-lg font-semibold">{program.name}</h2>
          </div>
          {hasSettings && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              <Settings size={16} />
            </Button>
          )}
        </div>

        {/* Settings Section */}
        {(!hasSettings || settingsOpen) && (
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium">
                {hasSettings ? "Column Mapping" : "Configure Column Mapping"}
              </h3>
              {!hasSettings && (
                <p className="text-sm text-muted-foreground mt-1">
                  Map your column labels so we can calculate volume stats.
                </p>
              )}
            </div>

            {columnLabels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No columns found in this program. Add some training data first.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Exercise column</Label>
                    <Select
                      value={draftExercise}
                      onValueChange={setDraftExercise}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columnLabels.map((label) => (
                          <SelectItem key={label} value={label}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sets column</Label>
                    <Select value={draftSets} onValueChange={setDraftSets}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columnLabels.map((label) => (
                          <SelectItem key={label} value={label}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reps column</Label>
                    <Select value={draftReps} onValueChange={setDraftReps}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columnLabels.map((label) => (
                          <SelectItem key={label} value={label}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Weight column</Label>
                    <Select value={draftWeight} onValueChange={setDraftWeight}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columnLabels.map((label) => (
                          <SelectItem key={label} value={label}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={handleSaveSettings}
                    disabled={isSaving || !canSaveSettings}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  {hasSettings && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSettingsOpen(false)}
                    >
                      Cancel
                    </Button>
                  )}
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
              </>
            )}
          </div>
        )}

        {/* Exercise Picker + Chart */}
        {hasSettings && (
          <>
            {allExercises.length > 0 ? (
              <>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Exercises
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {allExercises.map((exercise) => {
                      const isSelected =
                        selectedExercises.includes(exercise);
                      return (
                        <button
                          key={exercise}
                          onClick={() => toggleExercise(exercise)}
                          className={
                            isSelected
                              ? "rounded-full px-3 py-1 text-xs font-medium bg-primary text-primary-foreground transition-colors"
                              : "rounded-full px-3 py-1 text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          }
                        >
                          {exercise}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <VolumeChart
                  data={dataPoints}
                  exercises={selectedExercises}
                />
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No volume data found. Check that your column mapping matches
                  the labels used in your program.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
