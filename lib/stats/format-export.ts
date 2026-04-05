import type { Program, StatsSettings } from "@/lib/types/database";
import { WEEKDAY_LABELS } from "@/lib/types/database";
import type { ProgramHierarchy, LiftType } from "./types";
import { computeVolumeData, computeFatigueData } from "./computations";
import { LiftParser } from "./lift-parser";

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
  fatigue_summary: ExportFatigueDay[] | null;
  methodology: {
    volume: string;
    fatigue: string;
    residual_fatigue: string;
  };
}

export function formatProgramExport(
  program: Program,
  hierarchy: ProgramHierarchy,
  settings: StatsSettings | null,
): string {
  const sortedBlocks = [...hierarchy.blocks].sort((a, b) => a.block.order - b.block.order);

  const trainingData: ExportBlock[] = sortedBlocks.map((blockData) => {
    const sortedWeeks = [...blockData.weeks].sort((a, b) => a.week.week_number - b.week.week_number);

    const weeks: ExportWeek[] = sortedWeeks.map((weekData) => {
      const sortedDays = [...weekData.days].sort((a, b) => a.day.day_number - b.day.day_number);

      const days: ExportDay[] = sortedDays.map((dayData) => {
        const sortedColumns = [...dayData.columns].sort((a, b) => a.order - b.order);
        const sortedRows = [...dayData.rows].sort((a, b) => a.order - b.order);

        const exercises = sortedRows.map((row) => {
          const entry: Record<string, string> = {};
          for (const col of sortedColumns) {
            const val = row.cells[col.id];
            if (val) entry[col.label] = val;
          }
          return entry;
        }).filter((e) => Object.keys(e).length > 0);

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
    const { dataPoints, exercises } = computeVolumeData(records, hierarchy);
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

  // Fatigue
  let fatigueSummary: ExportFatigueDay[] | null = null;
  if (settings?.rpe_label && records.length > 0) {
    const { dataPoints: fatiguePoints, liftTypes } = computeFatigueData(records, hierarchy, false);
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
    fatigue_summary: fatigueSummary,
    methodology: {
      volume: "Sets x Reps x Weight (kg), summed per exercise per week.",
      fatigue: "Each set: reps x max(RPE - 5, 0) x lift_multiplier. Multipliers: Bench 1.0x, Squat 1.3x, Deadlift 1.6x. Sets at RPE <= 5 count as zero.",
      residual_fatigue: "Exponential carryover: Residual[t] = Residual[t-1] x 0.70 + DailyFatigue[t]. Decay 0.70 gives ~2-day half-life. Rest days apply multi-day decay (0.70^gap_days).",
    },
  };

  return JSON.stringify(exportData, null, 2);
}
