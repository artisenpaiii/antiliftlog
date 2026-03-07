"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import { useBlockCache } from "@/lib/contexts/block-cache-context";
import { computeBlockResidualFatigue, buildWeightPrediction } from "@/lib/weight-prediction";
import type { StatsSettings, DayColumn } from "@/lib/types/database";

interface UserPRs {
  squat: number | null;
  bench: number | null;
  deadlift: number | null;
}

export interface PredictionContextValue {
  weightLabel: string | null;
  predictWeight(cells: Record<string, string>, columns: DayColumn[], dayId: string): string | null;
  fatigueEnabled: boolean;
  toggleFatigue(): void;
  isPredictionAvailable: boolean;
}

export const PredictionContext = createContext<PredictionContextValue | null>(null);

export function usePrediction(): PredictionContextValue {
  const ctx = useContext(PredictionContext);
  if (!ctx) throw new Error("usePrediction must be used within PredictionProvider");
  return ctx;
}

interface PredictionProviderProps {
  programId: string;
  children: ReactNode;
}

export function PredictionProvider({ programId, children }: PredictionProviderProps) {
  const { weeks, getDays, getColumns, getRows } = useBlockCache();
  const [statsSettings, setStatsSettings] = useState<StatsSettings | null>(null);
  const [userPRs, setUserPRs] = useState<UserPRs>({ squat: null, bench: null, deadlift: null });
  const [fatigueEnabled, setFatigueEnabled] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const tables = createTables(supabase);

      const [settingsResult, userResult] = await Promise.all([
        tables.statsSettings.findByProgramId(programId),
        supabase.auth.getUser(),
      ]);

      if (settingsResult.data) setStatsSettings(settingsResult.data);

      const metadata = userResult.data.user?.user_metadata;
      if (metadata) {
        setUserPRs({
          squat: (metadata.pb_squat_gym as number | null) ?? null,
          bench: (metadata.pb_bench_gym as number | null) ?? null,
          deadlift: (metadata.pb_deadlift_gym as number | null) ?? null,
        });
      }
    }

    fetchData();
  }, [programId]);

  const residualFatigueByDayId = useMemo(() => {
    if (!statsSettings || !fatigueEnabled) return new Map<string, number>();

    const daysByWeekId = new Map<string, ReturnType<typeof getDays>>();
    const columnsByDayId = new Map<string, ReturnType<typeof getColumns>>();
    const rowsByDayId = new Map<string, ReturnType<typeof getRows>>();

    for (const week of weeks) {
      const days = getDays(week.id);
      daysByWeekId.set(week.id, days);
      for (const day of days) {
        columnsByDayId.set(day.id, getColumns(day.id));
        rowsByDayId.set(day.id, getRows(day.id));
      }
    }

    return computeBlockResidualFatigue(weeks, daysByWeekId, columnsByDayId, rowsByDayId, statsSettings);
  }, [statsSettings, fatigueEnabled, weeks, getDays, getColumns, getRows]);

  const isPredictionAvailable = useMemo(() => {
    if (!statsSettings) return false;
    return userPRs.squat !== null || userPRs.bench !== null || userPRs.deadlift !== null;
  }, [statsSettings, userPRs]);

  const weightLabel = statsSettings?.weight_label ?? null;

  const predictWeight = useCallback(
    (cells: Record<string, string>, columns: DayColumn[], dayId: string): string | null => {
      if (!statsSettings) return null;
      const residualFatigue = fatigueEnabled ? (residualFatigueByDayId.get(dayId) ?? 0) : 0;
      return buildWeightPrediction(cells, columns, statsSettings, userPRs, residualFatigue, fatigueEnabled);
    },
    [statsSettings, userPRs, fatigueEnabled, residualFatigueByDayId],
  );

  const toggleFatigue = useCallback(() => setFatigueEnabled((prev) => !prev), []);

  return (
    <PredictionContext.Provider value={{ weightLabel, predictWeight, fatigueEnabled, toggleFatigue, isPredictionAvailable }}>
      {children}
    </PredictionContext.Provider>
  );
}
