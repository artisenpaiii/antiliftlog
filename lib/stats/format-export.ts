import type { Program, StatsSettings } from "@/lib/types/database";
import { WEEKDAY_LABELS } from "@/lib/types/database";
import type { ProgramHierarchy, LiftType } from "./types";
import type { UserPRs } from "./stats-helpers";
import { WeekVolumeChart } from "./charts/volume-chart-class";
import { FatigueChartClass } from "./charts/fatigue-chart-class";
import { E1RMChartClass } from "./charts/e1rm-chart-class";
import { IntensityChartClass } from "./charts/intensity-chart-class";
import { WeeklyLoadChartClass } from "./charts/weekly-load-chart-class";
import { LiftParser } from "./lift-parser";

const EMPTY_PRS: UserPRs = { squat: null, bench: null, deadlift: null };

function round1(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

interface ExportDay {
  day_number: number;
  weekday: string | null;
  name: string | null;
  sleep_time: number | null;
  sleep_quality: number | null;
  exercises: Record<string, string>[];
}

interface ExportWeek {
  week_number: number;
  days: ExportDay[];
}

interface ExportBlock {
  name: string;
  order: number;
  start_date: string | null;
  weeks: ExportWeek[];
}

interface ExportVolumeWeek {
  label: string;
  exercises: Record<string, number>;
}

interface ExportFatigueDay {
  label: string;
  scores: Record<string, number>;
  total: number;
  residual: number;
}

interface ExportE1RMDay {
  label: string;
  squat: number | null;
  bench: number | null;
  deadlift: number | null;
}

interface ExportIntensityWeek {
  label: string;
  zone1_technique_sets: number;
  zone2_hypertrophy_sets: number;
  zone3_strength_sets: number;
  zone4_peaking_sets: number;
}

interface ExportWeeklyLoadLift {
  sets: number;
  total_reps: number;
  avg_rpe: number | null;
  peak_weight: number | null;
  volume: number;
  avg_intensity_pct: number | null;
}

interface ExportWeeklyLoadWeek {
  label: string;
  squat: ExportWeeklyLoadLift;
  bench: ExportWeeklyLoadLift;
  deadlift: ExportWeeklyLoadLift;
}

interface ProgramExport {
  program_name: string;
  exported_at: string;
  overview: {
    blocks: number;
    weeks: number;
    training_days: number;
  };
  training_data: ExportBlock[];
  volume_summary: ExportVolumeWeek[] | null;
  e1rm_summary: ExportE1RMDay[] | null;
  intensity_summary: ExportIntensityWeek[] | null;
  weekly_load_summary: ExportWeeklyLoadWeek[] | null;
  fatigue_summary: ExportFatigueDay[] | null;
  methodology: {
    volume: string;
    e1rm: string;
    intensity_zones: string;
    weekly_load: string;
    fatigue: string;
    residual_fatigue: string;
  };
}

export function formatProgramExport(
  program: Program,
  hierarchy: ProgramHierarchy,
  settings: StatsSettings | null,
  userPRs: UserPRs = EMPTY_PRS,
): string {
  const sortedBlocks = [...hierarchy.blocks].sort((a, b) => a.block.order - b.block.order);

  const trainingData: ExportBlock[] = sortedBlocks.map((blockData) => {
    const sortedWeeks = [...blockData.weeks].sort((a, b) => a.week.week_number - b.week.week_number);

    const weeks: ExportWeek[] = sortedWeeks.map((weekData) => {
      const sortedDays = [...weekData.days].sort((a, b) => a.day.day_number - b.day.day_number);

      const days: ExportDay[] = sortedDays.map((dayData) => {
        const sortedColumns = [...dayData.columns].sort((a, b) => a.order - b.order);
        const sortedRows = [...dayData.rows].sort((a, b) => a.order - b.order);

        const exercises = sortedRows
          .filter((row) => !("__separator_label" in (row.cells ?? {})))
          .map((row) => {
            const entry: Record<string, string> = {};
            for (const col of sortedColumns) {
              const val = row.cells[col.id];
              if (val) entry[col.label] = val;
            }
            return entry;
          })
          .filter((e) => Object.keys(e).length > 0);

        return {
          day_number: dayData.day.day_number,
          weekday: dayData.day.week_day_index !== null && dayData.day.week_day_index !== undefined
            ? WEEKDAY_LABELS[dayData.day.week_day_index]
            : null,
          name: dayData.day.name,
          sleep_time: dayData.day.sleep_time !== null ? Number(dayData.day.sleep_time) : null,
          sleep_quality: dayData.day.sleep_quality,
          exercises,
        };
      });

      return { week_number: weekData.week.week_number, days };
    });

    return {
      name: blockData.block.name,
      order: blockData.block.order,
      start_date: blockData.block.start_date,
      weeks,
    };
  });

  // Parse records for chart computations
  const parser = new LiftParser();
  const records = settings ? parser.parseHierarchy(hierarchy, settings) : [];

  // Volume
  let volumeSummary: ExportVolumeWeek[] | null = null;
  if (settings && records.length > 0) {
    const { dataPoints, exercises } = new WeekVolumeChart(records, hierarchy).computeData();
    if (exercises.length > 0) {
      volumeSummary = dataPoints.map((dp) => {
        const exVols: Record<string, number> = {};
        for (const ex of exercises) {
          const val = dp[ex];
          if (typeof val === "number") exVols[ex] = Math.round(val);
        }
        return { label: String(dp.label), exercises: exVols };
      });
    }
  }

  // E1RM progression (best estimated 1RM per lift per day)
  let e1rmSummary: ExportE1RMDay[] | null = null;
  if (settings?.rpe_label && records.length > 0) {
    const { dataPoints } = new E1RMChartClass(records, hierarchy, userPRs).computeData();
    if (dataPoints.length > 0) {
      e1rmSummary = dataPoints.map((dp) => ({
        label: dp.label,
        squat: dp.squat !== null ? Math.round(dp.squat) : null,
        bench: dp.bench !== null ? Math.round(dp.bench) : null,
        deadlift: dp.deadlift !== null ? Math.round(dp.deadlift) : null,
      }));
    }
  }

  // Intensity zone distribution (weekly set counts by % of gym PR)
  let intensitySummary: ExportIntensityWeek[] | null = null;
  if (records.length > 0) {
    const { dataPoints } = new IntensityChartClass(records, hierarchy, userPRs).computeData();
    if (dataPoints.length > 0) {
      intensitySummary = dataPoints.map((dp) => ({
        label: dp.label,
        zone1_technique_sets: dp.zone1,
        zone2_hypertrophy_sets: dp.zone2,
        zone3_strength_sets: dp.zone3,
        zone4_peaking_sets: dp.zone4,
      }));
    }
  }

  // Weekly load summary (per-lift sets, reps, RPE, peak weight, volume, intensity)
  let weeklyLoadSummary: ExportWeeklyLoadWeek[] | null = null;
  if (records.length > 0) {
    const rows = new WeeklyLoadChartClass(records, hierarchy, userPRs).computeData();
    if (rows.length > 0) {
      const toLift = (s: (typeof rows)[number]["squat"]): ExportWeeklyLoadLift => ({
        sets: s.sets,
        total_reps: s.totalReps,
        avg_rpe: round1(s.avgRpe),
        peak_weight: s.peakWeight,
        volume: Math.round(s.volume),
        avg_intensity_pct: round1(s.avgIntensityPct),
      });
      weeklyLoadSummary = rows.map((row) => ({
        label: row.label,
        squat: toLift(row.squat),
        bench: toLift(row.bench),
        deadlift: toLift(row.deadlift),
      }));
    }
  }

  // Fatigue
  let fatigueSummary: ExportFatigueDay[] | null = null;
  if (settings?.rpe_label && records.length > 0) {
    const { dataPoints: fatiguePoints, liftTypes } = new FatigueChartClass(records, hierarchy, false).computeData();
    if (fatiguePoints.length > 0) {
      fatigueSummary = fatiguePoints.map((dp) => {
        const scores: Record<string, number> = {};
        for (const lt of liftTypes as LiftType[]) {
          scores[lt] = Math.round(dp[lt] as number);
        }
        return {
          label: dp.label,
          scores,
          total: Math.round(dp.total),
          residual: typeof dp.residualFatigue === "number" ? Math.round(dp.residualFatigue) : 0,
        };
      });
    }
  }

  const totalWeeks = hierarchy.blocks.reduce((sum, b) => sum + b.weeks.length, 0);
  const totalDays = hierarchy.blocks.reduce(
    (sum, b) => sum + b.weeks.reduce((ws, w) => ws + w.days.length, 0),
    0,
  );

  const exportData: ProgramExport = {
    program_name: program.name,
    exported_at: new Date().toISOString(),
    overview: {
      blocks: hierarchy.blocks.length,
      weeks: totalWeeks,
      training_days: totalDays,
    },
    training_data: trainingData,
    volume_summary: volumeSummary,
    e1rm_summary: e1rmSummary,
    intensity_summary: intensitySummary,
    weekly_load_summary: weeklyLoadSummary,
    fatigue_summary: fatigueSummary,
    methodology: {
      volume: "Sets x Reps x Weight (kg), summed per exercise per week.",
      e1rm: "Estimated 1RM per lift per day = weight / RPE_percentage(reps, RPE), using the RPE-to-percentage chart. Only the top e1rm set per lift per day is kept. Requires reps, weight, and actual RPE.",
      intensity_zones: "Weekly set counts bucketed by working weight as a percentage of your gym PR. Zone1 <70% (technique/GPP), Zone2 70-80% (hypertrophy), Zone3 80-90% (strength), Zone4 >90% (peaking). Rows without a matching PR are skipped.",
      weekly_load: "Per lift per week: total sets, total reps, average actual RPE, peak weight (kg), volume (sets x reps x weight), and average intensity as % of gym PR.",
      fatigue: "Each row: sets x reps x max(RPE - 5, 0) x lift_multiplier. Multipliers: Bench 1.0x, Squat 1.3x, Deadlift 1.6x. Sets at RPE <= 5 count as zero. If a row's RPE is blank, the other RPE column (planned vs. actual) is used as a fallback.",
      residual_fatigue: "Exponential carryover: Residual[t] = Residual[t-1] x 0.70 + DailyFatigue[t]. Decay 0.70 gives ~2-day half-life. Rest days apply multi-day decay (0.70^gap_days).",
    },
  };

  return JSON.stringify(exportData, null, 2);
}
