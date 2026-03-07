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
import { E1RMChart } from "@/components/e1rm-chart";
import { IntensityChart } from "@/components/intensity-chart";
import { WeeklyLoadTable } from "@/components/weekly-load-table";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import type { Program, StatsSettings, UserMetadata } from "@/lib/types/database";
import {
  computeVolumeData,
  computeFatigueData,
  computeIntensityDistribution,
  computeWeeklyLoadSummary,
  computeE1RMData,
  loadProgramHierarchy,
} from "@/lib/stats";
import type { ProgramHierarchy } from "@/lib/stats";

interface StatsDetailProps {
  program: Program;
  onBack: () => void;
}

export function StatsDetail({ program, onBack }: StatsDetailProps) {
  const [settings, setSettings] = useState<StatsSettings | null>(null);
  const [hierarchy, setHierarchy] = useState<ProgramHierarchy | null>(null);
  const [columnLabels, setColumnLabels] = useState<string[]>([]);
  const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  // Settings draft
  const [draftExercise, setDraftExercise] = useState("");
  const [draftSets, setDraftSets] = useState("");
  const [draftReps, setDraftReps] = useState("");
  const [draftWeight, setDraftWeight] = useState("");
  const [draftRpe, setDraftRpe] = useState("__none__");
  const [draftPlannedRpe, setDraftPlannedRpe] = useState("__none__");
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

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const meta = user.user_metadata ?? {};
      setUserMetadata({
        display_name: typeof meta.display_name === "string" ? meta.display_name : "",
        pb_squat_gym: typeof meta.pb_squat_gym === "number" ? meta.pb_squat_gym : null,
        pb_bench_gym: typeof meta.pb_bench_gym === "number" ? meta.pb_bench_gym : null,
        pb_deadlift_gym: typeof meta.pb_deadlift_gym === "number" ? meta.pb_deadlift_gym : null,
        pb_squat_comp: typeof meta.pb_squat_comp === "number" ? meta.pb_squat_comp : null,
        pb_bench_comp: typeof meta.pb_bench_comp === "number" ? meta.pb_bench_comp : null,
        pb_deadlift_comp: typeof meta.pb_deadlift_comp === "number" ? meta.pb_deadlift_comp : null,
      });
    }

    const { hierarchy: builtHierarchy, columnLabels: labels, settings: fetchedSettings } = await loadProgramHierarchy(tables, program.id);

    setSettings(fetchedSettings);
    setHierarchy(builtHierarchy);
    setColumnLabels(labels);

    if (fetchedSettings) {
      setDraftExercise(fetchedSettings.exercise_label);
      setDraftSets(fetchedSettings.sets_label);
      setDraftReps(fetchedSettings.reps_label);
      setDraftWeight(fetchedSettings.weight_label);
      setDraftRpe(fetchedSettings.rpe_label ?? "__none__");
      setDraftPlannedRpe(fetchedSettings.planned_rpe_label ?? "__none__");
      setSettingsOpen(false);
    } else {
      setDraftExercise("");
      setDraftSets("");
      setDraftReps("");
      setDraftWeight("");
      setDraftRpe("__none__");
      setDraftPlannedRpe("__none__");
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

  // E1RM progression
  const { e1rmDataPoints, e1rmLiftTypes } = useMemo(() => {
    if (!hierarchy || !settings || !settings.rpe_label) {
      return { e1rmDataPoints: [], e1rmLiftTypes: [] };
    }
    const result = computeE1RMData(hierarchy, settings);
    return { e1rmDataPoints: result.dataPoints, e1rmLiftTypes: result.activeLiftTypes };
  }, [hierarchy, settings]);

  const userPRs = useMemo(() => ({
    squat: userMetadata?.pb_squat_gym ?? null,
    bench: userMetadata?.pb_bench_gym ?? null,
    deadlift: userMetadata?.pb_deadlift_gym ?? null,
  }), [userMetadata]);

  // Intensity zone distribution
  const { intensityDataPoints } = useMemo(() => {
    if (!hierarchy || !settings) return { intensityDataPoints: [] };
    const result = computeIntensityDistribution(hierarchy, settings, userPRs);
    return { intensityDataPoints: result.dataPoints };
  }, [hierarchy, settings, userPRs]);

  // Weekly load table
  const weeklyLoadRows = useMemo(() => {
    if (!hierarchy || !settings) return [];
    return computeWeeklyLoadSummary(hierarchy, settings, userPRs);
  }, [hierarchy, settings, userPRs]);

  // Reset selected exercises when allExercises changes — big three always on by default
  useEffect(() => {
    const bigThree = allExercises.filter((e) => {
      const lower = e.toLowerCase();
      return lower.includes("squat") || lower.includes("bench") || lower.includes("deadlift") || lower.includes("dead lift");
    });
    setSelectedExercises(bigThree.length > 0 ? bigThree : allExercises.slice(0, 5));
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
      planned_rpe_label: draftPlannedRpe === "__none__" ? null : draftPlannedRpe,
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
                    <Label>Actual RPE column (optional)</Label>
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
                  <div className="space-y-2">
                    <Label>Planned RPE column (optional)</Label>
                    <p className="text-xs text-muted-foreground">Used for weight prediction. Falls back to actual RPE if not set.</p>
                    <Select value={draftPlannedRpe} onValueChange={setDraftPlannedRpe}>
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

            {/* E1RM Progression Chart */}
            {settings?.rpe_label && e1rmDataPoints.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-medium text-muted-foreground">E1RM Progression</h3>
                </div>
                <E1RMChart data={e1rmDataPoints} activeLiftTypes={e1rmLiftTypes} userPRs={userPRs} />
              </div>
            )}

            {/* Intensity Zone Distribution */}
            {intensityDataPoints.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-medium text-muted-foreground">Intensity Zone Distribution</h3>
                </div>
                <IntensityChart data={intensityDataPoints} />
              </div>
            )}

            {/* Weekly Load Table */}
            {weeklyLoadRows.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Weekly Load Summary</h3>
                <p className="text-xs text-muted-foreground">Volume color = avg intensity vs your gym PRs. Peak weight in kg.</p>
                <WeeklyLoadTable rows={weeklyLoadRows} />
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
                            <p className="font-medium text-foreground">Residual fatigue (carryover)</p>
                            <p className="text-muted-foreground">
                              Daily bars show fatigue added that day. Residual fatigue shows how much you’re still carrying into the next day. It uses
                              exponential decay (the standard model in sport science for fatigue recovery):
                            </p>
                            <div className="rounded-md bg-muted/50 px-2.5 py-2 space-y-1 text-muted-foreground">
                              <p>
                                <span className="text-foreground">Residual[t]</span> = Residual[t−1] × <span className="text-foreground">decay</span> +
                                DailyFatigue[t]
                              </p>
                              <p>
                                Default <span className="text-foreground">decay = 0.70</span> → about <span className="text-foreground">70%</span> of
                                yesterday’s fatigue carries forward, meaning roughly <span className="text-foreground">30%</span> clears per 24h.
                              </p>
                              <p>
                                This implies a ~2 day half-life (<span className="text-foreground">0.70² ≈ 0.49</span>), which matches typical 24–72h recovery
                                windows seen after heavy compound lifting (strength/performance readiness often rebounds over a few days).
                              </p>
                            </div>
                            <p className="text-muted-foreground">
                              If sleep adjustment is enabled, sleep also influences recovery rate by adjusting decay: better sleep lowers decay (faster
                              recovery), worse sleep raises decay (slower recovery).
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
