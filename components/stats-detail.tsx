"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Settings, Check, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VolumeChart } from "@/components/volume-chart";
import { FatigueChart } from "@/components/fatigue-chart";
import type { FatigueDataPoint } from "@/components/fatigue-chart";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import type { Program, Block, Week, Day, DayColumn, DayRow, StatsSettings } from "@/lib/types/database";

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

type LiftType = "squat" | "bench" | "deadlift";

const LIFT_MULTIPLIERS: Record<LiftType, number> = {
  bench: 1.0,
  squat: 1.3,
  deadlift: 1.6,
};

function classifyLift(exerciseName: string): LiftType | null {
  const lower = exerciseName.toLowerCase();
  if (lower.includes("deadlift") || lower.includes("dead lift")) return "deadlift";
  if (lower.includes("squat")) return "squat";
  if (lower.includes("bench")) return "bench";
  return null;
}

function computeFatigueData(
  hierarchy: ProgramHierarchy,
  settings: StatsSettings,
  sleepAdjustmentEnabled: boolean,
): { dataPoints: FatigueDataPoint[]; liftTypes: LiftType[] } {
  const dataPoints: FatigueDataPoint[] = [];
  const activeLiftTypes = new Set<LiftType>();

  if (!settings.rpe_label) {
    return { dataPoints: [], liftTypes: [] };
  }

  for (const blockData of hierarchy.blocks) {
    for (const weekData of blockData.weeks) {
      for (const dayData of weekData.days) {
        const label = `B${blockData.block.order + 1}W${weekData.week.week_number}D${dayData.day.day_number}`;

        const exerciseCol = dayData.columns.find((c) => c.label === settings.exercise_label);
        const repsCol = dayData.columns.find((c) => c.label === settings.reps_label);
        const rpeCol = dayData.columns.find((c) => c.label === settings.rpe_label);

        const dayScores: Record<LiftType, number> = {
          squat: 0,
          bench: 0,
          deadlift: 0,
        };

        if (exerciseCol && repsCol && rpeCol) {
          for (const row of dayData.rows) {
            const exercise = row.cells[exerciseCol.id]?.trim();
            if (!exercise) continue;

            const liftType = classifyLift(exercise);
            if (!liftType) continue;

            const reps = parseNumber(row.cells[repsCol.id]);
            const rpe = parseNumber(row.cells[rpeCol.id]);

            if (reps <= 0 || rpe <= 0) continue;

            const effort = Math.max(rpe - 5, 0);
            const setFatigue = reps * effort * LIFT_MULTIPLIERS[liftType];
            dayScores[liftType] += setFatigue;

            if (setFatigue > 0) {
              activeLiftTypes.add(liftType);
            }
          }
        }

        let total = dayScores.squat + dayScores.bench + dayScores.deadlift;
        let sleepAdjusted = false;

        // Sleep-based fatigue adjustment (optional, toggle-controlled).
        // Sleep modifies recovery cost, not training stress itself.
        // Factor = 0.85 + 0.30 × (quality / 100), producing a 0.85–1.15 range (±15%).
        //  - quality  0 → 0.85× (impaired recovery, stress feels harder)
        //  - quality 50 → 1.00× (neutral)
        //  - quality 100 → 1.15× (well recovered, can tolerate more)
        // Capped at ±15% because training load is the primary fatigue driver;
        // sleep is a meaningful but secondary modifier.
        if (sleepAdjustmentEnabled && dayData.day.sleep_quality !== null) {
          const clampedQuality = Math.max(0, Math.min(100, dayData.day.sleep_quality));
          const factor = 0.85 + 0.3 * (clampedQuality / 100);
          dayScores.squat *= factor;
          dayScores.bench *= factor;
          dayScores.deadlift *= factor;
          total = dayScores.squat + dayScores.bench + dayScores.deadlift;
          sleepAdjusted = true;
        }

        dataPoints.push({
          label,
          total,
          squat: dayScores.squat,
          bench: dayScores.bench,
          deadlift: dayScores.deadlift,
          sleepQuality: dayData.day.sleep_quality,
          sleepTime: dayData.day.sleep_time !== null ? Number(dayData.day.sleep_time) : null,
          sleepAdjusted,
        });
      }
    }
  }

  const liftTypes: LiftType[] = (["squat", "bench", "deadlift"] as const).filter((lt) => activeLiftTypes.has(lt));

  return { dataPoints, liftTypes };
}

function computeVolumeData(hierarchy: ProgramHierarchy, settings: StatsSettings): { dataPoints: WeekDataPoint[]; exercises: string[] } {
  const exerciseVolumes: Record<string, Record<string, number>> = {};
  const weekLabels: string[] = [];

  for (const blockData of hierarchy.blocks) {
    for (const weekData of blockData.weeks) {
      const label = `B${blockData.block.order + 1}W${weekData.week.week_number}`;
      weekLabels.push(label);

      for (const dayData of weekData.days) {
        const exerciseCol = dayData.columns.find((c) => c.label === settings.exercise_label);
        const setsCol = dayData.columns.find((c) => c.label === settings.sets_label);
        const repsCol = dayData.columns.find((c) => c.label === settings.reps_label);
        const weightCol = dayData.columns.find((c) => c.label === settings.weight_label);

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
          exerciseVolumes[exercise][label] = (exerciseVolumes[exercise][label] ?? 0) + volume;
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
  const [draftRpe, setDraftRpe] = useState("__none__");
  const [sleepAdjustmentEnabled, setSleepAdjustmentEnabled] = useState(false);
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
    const [settingsResult, blocksResult] = await Promise.all([tables.statsSettings.findByProgramId(program.id), tables.blocks.findByProgramId(program.id)]);

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
        const dayDataArr: ProgramHierarchy["blocks"][number]["weeks"][number]["days"] = [];

        const dayFetches = (days ?? []).map(async (day) => {
          const [colResult, rowResult] = await Promise.all([tables.dayColumns.findByDayId(day.id), tables.dayRows.findByDayId(day.id)]);
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
      setDraftRpe(fetchedSettings.rpe_label ?? "__none__");
      setSettingsOpen(false);
    } else {
      setDraftExercise("");
      setDraftSets("");
      setDraftReps("");
      setDraftWeight("");
      setDraftRpe("__none__");
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

  // Compute fatigue data when settings, hierarchy, or sleep toggle changes
  const { fatigueDataPoints, activeLiftTypes } = useMemo(() => {
    if (!hierarchy || !settings || !settings.rpe_label) {
      return { fatigueDataPoints: [], activeLiftTypes: [] as string[] };
    }
    const result = computeFatigueData(hierarchy, settings, sleepAdjustmentEnabled);
    return { fatigueDataPoints: result.dataPoints, activeLiftTypes: result.liftTypes };
  }, [hierarchy, settings, sleepAdjustmentEnabled]);

  // Reset selected exercises when allExercises changes
  useEffect(() => {
    setSelectedExercises(allExercises.slice(0, 5));
  }, [allExercises]);

  function toggleExercise(exercise: string) {
    setSelectedExercises((prev) => (prev.includes(exercise) ? prev.filter((e) => e !== exercise) : [...prev, exercise]));
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
    const { data, error } = await tables.statsSettings.upsertByProgramId(program.id, {
      program_id: program.id,
      created_by: user.id,
      exercise_label: draftExercise,
      sets_label: draftSets,
      reps_label: draftReps,
      weight_label: draftWeight,
      rpe_label: draftRpe === "__none__" ? null : draftRpe,
    });

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
  const canSaveSettings = draftExercise && draftSets && draftReps && draftWeight;

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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSettingsOpen(!settingsOpen)}>
              <Settings size={16} />
            </Button>
          )}
        </div>

        {/* Settings Section */}
        {(!hasSettings || settingsOpen) && (
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium">{hasSettings ? "Column Mapping" : "Configure Column Mapping"}</h3>
              {!hasSettings && <p className="text-sm text-muted-foreground mt-1">Map your column labels so we can calculate volume stats.</p>}
            </div>

            {columnLabels.length === 0 ? (
              <p className="text-sm text-muted-foreground">No columns found in this program. Add some training data first.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Exercise column</Label>
                    <Select value={draftExercise} onValueChange={setDraftExercise}>
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
                  <div className="space-y-2">
                    <Label>RPE column (optional)</Label>
                    <Select value={draftRpe} onValueChange={setDraftRpe}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
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
                  <Button size="sm" onClick={handleSaveSettings} disabled={isSaving || !canSaveSettings}>
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  {hasSettings && (
                    <Button size="sm" variant="ghost" onClick={() => setSettingsOpen(false)}>
                      Cancel
                    </Button>
                  )}
                  {saveMessage && (
                    <span className={saveMessage.type === "success" ? "text-sm text-emerald-400 flex items-center gap-1" : "text-sm text-destructive"}>
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
                  <h3 className="text-sm font-medium text-muted-foreground">Exercises</h3>
                  <div className="flex flex-wrap gap-2">
                    {allExercises.map((exercise) => {
                      const isSelected = selectedExercises.includes(exercise);
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

                <VolumeChart data={dataPoints} exercises={selectedExercises} />
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <p className="text-sm text-muted-foreground">No volume data found. Check that your column mapping matches the labels used in your program.</p>
              </div>
            )}

            {/* Fatigue Chart */}
            {settings?.rpe_label && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-col">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-medium text-muted-foreground">Estimated Fatigue</h3>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                          <Info size={14} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="bottom" align="start" className="w-80 text-xs p-0">
                        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-3">
                          <p className="font-medium text-sm">How fatigue is calculated</p>

                          <div className="space-y-1.5">
                            <p className="font-medium text-foreground">Base fatigue</p>
                            <p className="text-muted-foreground">
                              Each set: <span className="text-foreground">reps × (RPE − 5) × lift multiplier</span>. Sets at RPE ≤ 5 count as zero.
                            </p>
                            <div className="text-muted-foreground">
                              <p className="mb-0.5">Multipliers reflect systemic demand:</p>
                              <ul className="list-disc pl-4 space-y-0.5">
                                <li>Bench: 1.0× (least systemic stress)</li>
                                <li>Squat: 1.3×</li>
                                <li>Deadlift: 1.6× (most systemic stress)</li>
                              </ul>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <p className="font-medium text-foreground">Score scale</p>
                            <div className="rounded-md bg-muted/50 px-2.5 py-2 space-y-0.5 text-muted-foreground">
                              <p>
                                <span className="text-foreground">0–30</span> — Light: warm-up, deload, or low-effort day
                              </p>
                              <p>
                                <span className="text-foreground">30–60</span> — Moderate: typical training session
                              </p>
                              <p>
                                <span className="text-foreground">60–100</span> — Hard: high-effort, multiple compounds
                              </p>
                              <p>
                                <span className="text-foreground">100–150</span> — Very hard: high volume + high RPE
                              </p>
                              <p>
                                <span className="text-foreground">150+</span> — Extreme: peak effort or overreaching
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <p className="font-medium text-foreground">Sleep adjustment</p>
                            <p className="text-muted-foreground">
                              Sleep doesn&apos;t add stress — it changes how costly that stress is to recover from. When enabled, fatigue is scaled by ±15%:
                            </p>
                            <div className="rounded-md bg-muted/50 px-2.5 py-2 space-y-0.5 text-muted-foreground">
                              <p>
                                Poor sleep (0) → <span className="text-foreground">0.85×</span> — under-recovered
                              </p>
                              <p>
                                Average sleep (50) → <span className="text-foreground">1.00×</span> — no change
                              </p>
                              <p>
                                Great sleep (100) → <span className="text-foreground">1.15×</span> — well recovered
                              </p>
                            </div>
                            <p className="text-muted-foreground">
                              Capped at ±15% — training load stays the primary driver. One bad night won&apos;t invalidate your data.
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <p className="font-medium text-foreground">Reading the chart</p>
                            <p className="text-muted-foreground">
                              <span className="text-foreground">Without</span> sleep adjustment: objective training stress — comparable across days.
                            </p>
                            <p className="text-muted-foreground">
                              <span className="text-foreground">With</span> sleep adjustment: effective fatigue — how expensive that stress was given your
                              recovery.
                            </p>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={sleepAdjustmentEnabled} onCheckedChange={(checked) => setSleepAdjustmentEnabled(checked === true)} />
                    <span className="text-xs text-muted-foreground">Sleep adjustment</span>
                  </label>
                </div>

                <FatigueChart data={fatigueDataPoints} liftTypes={activeLiftTypes} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
