"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import type { FatigueDataPoint } from "@/components/fatigue-chart";
import type { WeekDataPoint, IntensityZonePoint, WeeklyLoadRow, LiftType } from "@/lib/stats";
import type { E1RMDataPoint } from "@/lib/stats/e1rm-computations";
import type { ParsedLiftRecord } from "@/lib/stats/types";
import { StatsEngine } from "@/lib/stats/stats-engine";

interface StatsDetailProps {
  program: Program;
  onBack: () => void;
}

function ChartSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-border p-6 flex flex-col items-center justify-center gap-2 min-h-[200px]">
      <Loader2 size={18} className="animate-spin text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{title}</span>
    </div>
  );
}

export function StatsDetail({ program, onBack }: StatsDetailProps) {
  const [settings, setSettings] = useState<StatsSettings | null>(null);
  const [columnLabels, setColumnLabels] = useState<string[]>([]);
  const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Parsed records
  const [records, setRecords] = useState<ParsedLiftRecord[] | null>(null);

  // Independent chart state — null = computing, empty array = no data
  const [volumeData, setVolumeData] = useState<{ dataPoints: WeekDataPoint[]; exercises: string[] } | null>(null);
  const [fatigueData, setFatigueData] = useState<{ dataPoints: FatigueDataPoint[]; liftTypes: LiftType[] } | null>(null);
  const [e1rmData, setE1rmData] = useState<{ dataPoints: E1RMDataPoint[]; activeLiftTypes: LiftType[] } | null>(null);
  const [intensityData, setIntensityData] = useState<{ dataPoints: IntensityZonePoint[] } | null>(null);
  const [weeklyLoadData, setWeeklyLoadData] = useState<WeeklyLoadRow[] | null>(null);

  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  // Settings draft
  const [draftExercise, setDraftExercise] = useState("");
  const [draftSets, setDraftSets] = useState("");
  const [draftReps, setDraftReps] = useState("");
  const [draftWeight, setDraftWeight] = useState("");
  const [draftRpe, setDraftRpe] = useState("__none__");
  const [draftPlannedRpe, setDraftPlannedRpe] = useState("__none__");
  const [draftVariation, setDraftVariation] = useState("__none__");
  const [sleepAdjustmentEnabled, setSleepAdjustmentEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Stale guard
  const generationRef = useRef(0);
  const engineRef = useRef<StatsEngine>(new StatsEngine());

  const loadData = useCallback(async () => {
    setLoading(true);
    setSaveMessage(null);
    const gen = ++generationRef.current;

    const supabase = createClient();
    const tables = createTables(supabase);

    const { data: { user } } = await supabase.auth.getUser();
    if (gen !== generationRef.current) return;

    let meta: UserMetadata | null = null;
    if (user) {
      const m = user.user_metadata ?? {};
      meta = {
        display_name: typeof m.display_name === "string" ? m.display_name : "",
        pb_squat_gym: typeof m.pb_squat_gym === "number" ? m.pb_squat_gym : null,
        pb_bench_gym: typeof m.pb_bench_gym === "number" ? m.pb_bench_gym : null,
        pb_deadlift_gym: typeof m.pb_deadlift_gym === "number" ? m.pb_deadlift_gym : null,
        pb_squat_comp: typeof m.pb_squat_comp === "number" ? m.pb_squat_comp : null,
        pb_bench_comp: typeof m.pb_bench_comp === "number" ? m.pb_bench_comp : null,
        pb_deadlift_comp: typeof m.pb_deadlift_comp === "number" ? m.pb_deadlift_comp : null,
      };
      setUserMetadata(meta);
    }

    const engine = engineRef.current;
    const { columnLabels: labels, settings: fetchedSettings } = await engine.load(tables, program.id);
    if (gen !== generationRef.current) return;

    setSettings(fetchedSettings);
    setColumnLabels(labels);

    if (fetchedSettings) {
      setDraftExercise(fetchedSettings.exercise_label);
      setDraftSets(fetchedSettings.sets_label);
      setDraftReps(fetchedSettings.reps_label);
      setDraftWeight(fetchedSettings.weight_label);
      setDraftRpe(fetchedSettings.rpe_label ?? "__none__");
      setDraftPlannedRpe(fetchedSettings.planned_rpe_label ?? "__none__");
      setDraftVariation(fetchedSettings.variation_label ?? "__none__");
      setSettingsOpen(false);
    } else {
      setDraftExercise("");
      setDraftSets("");
      setDraftReps("");
      setDraftWeight("");
      setDraftRpe("__none__");
      setDraftPlannedRpe("__none__");
      setDraftVariation("__none__");
      setSettingsOpen(true);
    }

    setLoading(false);

    // Phase 2: Parse records
    if (fetchedSettings) {
      const parsed = engine.parse();
      if (gen !== generationRef.current) return;
      setRecords(parsed);

      const userPRs = {
        squat: meta?.pb_squat_gym ?? null,
        bench: meta?.pb_bench_gym ?? null,
        deadlift: meta?.pb_deadlift_gym ?? null,
      };

      // Reset chart data to null (loading)
      setVolumeData(null);
      setFatigueData(null);
      setE1rmData(null);
      setIntensityData(null);
      setWeeklyLoadData(null);

      // Fire all in parallel
      engine.computeVolume(parsed).then((result) => {
        if (gen === generationRef.current) setVolumeData(result);
      });
      engine.computeFatigue(parsed, false).then((result) => {
        if (gen === generationRef.current) setFatigueData(result);
      });
      engine.computeE1RM(parsed).then((result) => {
        if (gen === generationRef.current) setE1rmData(result);
      });
      engine.computeIntensity(parsed, userPRs).then((result) => {
        if (gen === generationRef.current) setIntensityData(result);
      });
      engine.computeWeeklyLoad(parsed, userPRs).then((result) => {
        if (gen === generationRef.current) setWeeklyLoadData(result);
      });
    }
  }, [program.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recompute only fatigue when sleep toggle changes
  useEffect(() => {
    if (!records || !settings?.rpe_label) return;
    const engine = engineRef.current;
    const gen = ++generationRef.current;

    setFatigueData(null);
    engine.computeFatigue(records, sleepAdjustmentEnabled).then((result) => {
      if (gen === generationRef.current) setFatigueData(result);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepAdjustmentEnabled]);

  // Reset selected exercises when volume data changes
  useEffect(() => {
    if (!volumeData) return;
    const allExercises = volumeData.exercises;
    const bigThree = allExercises.filter((e) => {
      const lower = e.toLowerCase();
      return lower.includes("squat") || lower.includes("bench") || lower.includes("deadlift") || lower.includes("dead lift");
    });
    setSelectedExercises(bigThree.length > 0 ? bigThree : allExercises.slice(0, 5));
  }, [volumeData]);

  function toggleExercise(exercise: string) {
    setSelectedExercises((prev) => (prev.includes(exercise) ? prev.filter((e) => e !== exercise) : [...prev, exercise]));
  }

  async function handleSaveSettings() {
    if (!draftExercise || !draftSets || !draftReps || !draftWeight) return;

    setIsSaving(true);
    setSaveMessage(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

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
      variation_label: draftVariation === "__none__" ? null : draftVariation,
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

    // Re-parse and recompute with new settings
    loadData();
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
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors lg:hidden"
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
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {columnLabels.map((label) => (<SelectItem key={label} value={label}>{label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sets column</Label>
                    <Select value={draftSets} onValueChange={setDraftSets}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {columnLabels.map((label) => (<SelectItem key={label} value={label}>{label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reps column</Label>
                    <Select value={draftReps} onValueChange={setDraftReps}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {columnLabels.map((label) => (<SelectItem key={label} value={label}>{label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Weight column</Label>
                    <Select value={draftWeight} onValueChange={setDraftWeight}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {columnLabels.map((label) => (<SelectItem key={label} value={label}>{label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Actual RPE column (optional)</Label>
                    <Select value={draftRpe} onValueChange={setDraftRpe}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {columnLabels.map((label) => (<SelectItem key={label} value={label}>{label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Planned RPE column (optional)</Label>
                    <p className="text-xs text-muted-foreground">Used for weight prediction. Falls back to actual RPE if not set.</p>
                    <Select value={draftPlannedRpe} onValueChange={setDraftPlannedRpe}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {columnLabels.map((label) => (<SelectItem key={label} value={label}>{label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Variation column (optional)</Label>
                    <p className="text-xs text-muted-foreground">Column where exercise variations are specified (e.g. &quot;Close Grip&quot;, &quot;Sumo&quot;).</p>
                    <Select value={draftVariation} onValueChange={setDraftVariation}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {columnLabels.map((label) => (<SelectItem key={label} value={label}>{label}</SelectItem>))}
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

        {/* Charts */}
        {hasSettings && (
          <>
            {/* Volume Chart */}
            {volumeData === null ? (
              <ChartSkeleton title="Loading volume data..." />
            ) : volumeData.exercises.length > 0 ? (
              <>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Exercises</h3>
                  <div className="flex flex-wrap gap-2">
                    {volumeData.exercises.map((exercise) => {
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

                <VolumeChart data={volumeData.dataPoints} exercises={selectedExercises} />
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <p className="text-sm text-muted-foreground">No volume data found. Check that your column mapping matches the labels used in your program.</p>
              </div>
            )}

            {/* E1RM Progression Chart */}
            {settings?.rpe_label && (
              e1rmData === null ? (
                <ChartSkeleton title="Loading E1RM data..." />
              ) : e1rmData.dataPoints.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-medium text-muted-foreground">E1RM Progression</h3>
                  </div>
                  <E1RMChart data={e1rmData.dataPoints} activeLiftTypes={e1rmData.activeLiftTypes} userPRs={{
                    squat: userMetadata?.pb_squat_gym ?? null,
                    bench: userMetadata?.pb_bench_gym ?? null,
                    deadlift: userMetadata?.pb_deadlift_gym ?? null,
                  }} />
                </div>
              ) : null
            )}

            {/* Intensity Zone Distribution */}
            {intensityData === null ? (
              <ChartSkeleton title="Loading intensity data..." />
            ) : intensityData.dataPoints.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-medium text-muted-foreground">Intensity Zone Distribution</h3>
                </div>
                <IntensityChart data={intensityData.dataPoints} />
              </div>
            ) : null}

            {/* Weekly Load Table */}
            {weeklyLoadData === null ? (
              <ChartSkeleton title="Loading weekly load data..." />
            ) : weeklyLoadData.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Weekly Load Summary</h3>
                <p className="text-xs text-muted-foreground">Volume color = avg intensity vs your gym PRs. Peak weight in kg.</p>
                <WeeklyLoadTable rows={weeklyLoadData} />
              </div>
            ) : null}

            {/* Fatigue Chart */}
            {settings?.rpe_label && (
              fatigueData === null ? (
                <ChartSkeleton title="Loading fatigue data..." />
              ) : fatigueData.dataPoints.length > 0 ? (
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
                                <p><span className="text-foreground">0–30</span> — Light: warm-up, deload, or low-effort day</p>
                                <p><span className="text-foreground">30–60</span> — Moderate: typical training session</p>
                                <p><span className="text-foreground">60–100</span> — Hard: high-effort, multiple compounds</p>
                                <p><span className="text-foreground">100–150</span> — Very hard: high volume + high RPE</p>
                                <p><span className="text-foreground">150+</span> — Extreme: peak effort or overreaching</p>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <p className="font-medium text-foreground">Sleep adjustment</p>
                              <p className="text-muted-foreground">
                                Sleep doesn&apos;t add stress — it changes how costly that stress is to recover from. When enabled, fatigue is scaled by ±15%:
                              </p>
                              <div className="rounded-md bg-muted/50 px-2.5 py-2 space-y-0.5 text-muted-foreground">
                                <p>Poor sleep (0) → <span className="text-foreground">0.85×</span> — under-recovered</p>
                                <p>Average sleep (50) → <span className="text-foreground">1.00×</span> — no change</p>
                                <p>Great sleep (100) → <span className="text-foreground">1.15×</span> — well recovered</p>
                              </div>
                              <p className="text-muted-foreground">
                                Capped at ±15% — training load stays the primary driver. One bad night won&apos;t invalidate your data.
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <p className="font-medium text-foreground">Residual fatigue (carryover)</p>
                              <p className="text-muted-foreground">
                                Daily bars show fatigue added that day. Residual fatigue shows how much you&apos;re still carrying into the next day. It uses
                                exponential decay (the standard model in sport science for fatigue recovery):
                              </p>
                              <div className="rounded-md bg-muted/50 px-2.5 py-2 space-y-1 text-muted-foreground">
                                <p><span className="text-foreground">Residual[t]</span> = Residual[t−1] × <span className="text-foreground">decay</span> + DailyFatigue[t]</p>
                                <p>Default <span className="text-foreground">decay = 0.70</span> → about <span className="text-foreground">70%</span> of yesterday&apos;s fatigue carries forward, meaning roughly <span className="text-foreground">30%</span> clears per 24h.</p>
                                <p>This implies a ~2 day half-life (<span className="text-foreground">0.70² ≈ 0.49</span>), which matches typical 24–72h recovery windows seen after heavy compound lifting.</p>
                              </div>
                              <p className="text-muted-foreground">
                                If sleep adjustment is enabled, sleep also influences recovery rate by adjusting decay: better sleep lowers decay (faster recovery), worse sleep raises decay (slower recovery).
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <p className="font-medium text-foreground">Reading the chart</p>
                              <p className="text-muted-foreground">
                                <span className="text-foreground">Without</span> sleep adjustment: objective training stress — comparable across days.
                              </p>
                              <p className="text-muted-foreground">
                                <span className="text-foreground">With</span> sleep adjustment: effective fatigue — how expensive that stress was given your recovery.
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

                  <FatigueChart data={fatigueData.dataPoints} liftTypes={fatigueData.liftTypes} />
                </div>
              ) : null
            )}
          </>
        )}
      </div>
    </div>
  );
}
