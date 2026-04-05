import type { StatsSettings } from "@/lib/types/database";
import type {
  ProgramHierarchy,
  MainLift,
  MainLiftTag,
  VariantTag,
  LiftClassification,
  ParsedLiftRecord,
} from "./types";
import { parseNumber, parseRpe } from "./computations";

interface VariantEntry {
  pattern: RegExp;
  tag: VariantTag;
}

interface MainLiftEntry {
  pattern: RegExp;
  mainLift: MainLift;
  mainTag: MainLiftTag;
}

/** Human-readable labels for tags */
export const TAG_LABELS: Record<string, string> = {
  // Main lifts
  s: "Squat",
  bp: "Bench",
  d: "Deadlift",
  // Bench variants
  cg: "Close Grip",
  larsen: "Larsen",
  spoto: "Spoto",
  floor: "Floor Press",
  pin: "Pin Press",
  board: "Board Press",
  paused: "Paused",
  tng: "Touch & Go",
  slingshot: "Slingshot",
  incline: "Incline",
  decline: "Decline",
  db: "Dumbbell",
  // Squat variants
  front: "Front Squat",
  ssb: "SSB",
  highbar: "High Bar",
  lowbar: "Low Bar",
  box: "Box Squat",
  tempo: "Tempo",
  belt: "Belt Squat",
  goblet: "Goblet",
  hack: "Hack Squat",
  // Deadlift variants
  sumo: "Sumo",
  conventional: "Conventional",
  deficit: "Deficit",
  block: "Block Pull",
  rack: "Rack Pull",
  rdl: "RDL",
  sldl: "Stiff Leg",
  trapbar: "Trap Bar",
  snatchgrip: "Snatch Grip",
};

const BENCH_VARIANTS: VariantEntry[] = [
  { pattern: /closegrip|cg(?:bench|bp)/, tag: "cg" },
  { pattern: /larsen/, tag: "larsen" },
  { pattern: /spoto/, tag: "spoto" },
  { pattern: /floorpress/, tag: "floor" },
  { pattern: /pinpress/, tag: "pin" },
  { pattern: /boardpress/, tag: "board" },
  { pattern: /pausedbench|pausebench/, tag: "paused" },
  { pattern: /touchandgo|tng/, tag: "tng" },
  { pattern: /slingshot/, tag: "slingshot" },
  { pattern: /incline(?:bench|press)/, tag: "incline" },
  { pattern: /decline(?:bench|press)/, tag: "decline" },
  { pattern: /dbbench|dumbbellbench|dumbellbench/, tag: "db" },
];

const SQUAT_VARIANTS: VariantEntry[] = [
  { pattern: /frontsquat/, tag: "front" },
  { pattern: /ssb|safetybar|safetysquat/, tag: "ssb" },
  { pattern: /highbar/, tag: "highbar" },
  { pattern: /lowbar/, tag: "lowbar" },
  { pattern: /pause(?:d)?squat/, tag: "paused" },
  { pattern: /pinsquat/, tag: "pin" },
  { pattern: /boxsquat/, tag: "box" },
  { pattern: /temposquat/, tag: "tempo" },
  { pattern: /beltsquat/, tag: "belt" },
  { pattern: /gobletsquat/, tag: "goblet" },
  { pattern: /hacksquat/, tag: "hack" },
];

const DEADLIFT_VARIANTS: VariantEntry[] = [
  { pattern: /sumo/, tag: "sumo" },
  { pattern: /conventional/, tag: "conventional" },
  { pattern: /deficit/, tag: "deficit" },
  { pattern: /blockpull/, tag: "block" },
  { pattern: /rackpull/, tag: "rack" },
  { pattern: /rdl|romaniandeadlift|romaniandl/, tag: "rdl" },
  { pattern: /stiffleg|sldl/, tag: "sldl" },
  { pattern: /pause(?:d)?deadlift/, tag: "paused" },
  { pattern: /trapbar|hexbar/, tag: "trapbar" },
  { pattern: /snatchgrip/, tag: "snatchgrip" },
];

const VARIANT_MAP: Record<MainLift, VariantEntry[]> = {
  bench: BENCH_VARIANTS,
  squat: SQUAT_VARIANTS,
  deadlift: DEADLIFT_VARIANTS,
};

// Order matters: deadlift first to avoid false matches
const MAIN_LIFT_PATTERNS: MainLiftEntry[] = [
  { pattern: /deadlift|deadlft|dl(?!ateral)|rdl|romaniandeadlift|stiffleg|sldl|blockpull|rackpull/, mainLift: "deadlift", mainTag: "d" },
  { pattern: /squat/, mainLift: "squat", mainTag: "s" },
  { pattern: /bench|bp(?!h)|floorpress|pinpress|boardpress|larsenpress|spotopress/, mainLift: "bench", mainTag: "bp" },
];

function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "");
}

function findColumn(
  columns: { id: string; label: string }[],
  label: string,
): { id: string; label: string } | undefined {
  const lower = label.toLowerCase();
  return columns.find((c) => c.label.toLowerCase() === lower);
}

export class LiftParser {
  /** Classify an exercise name + optional variation text */
  classify(exerciseName: string, variation?: string): LiftClassification | null {
    const normalized = normalize(exerciseName);
    const combinedNormalized = variation
      ? normalized + normalize(variation)
      : normalized;

    // Detect main lift
    let mainLift: MainLift | null = null;
    let mainTag: MainLiftTag | null = null;

    for (const entry of MAIN_LIFT_PATTERNS) {
      if (entry.pattern.test(combinedNormalized)) {
        mainLift = entry.mainLift;
        mainTag = entry.mainTag;
        break;
      }
    }

    if (!mainLift || !mainTag) return null;

    // Detect variant tags from both exercise name and variation column
    const variantTags: VariantTag[] = [];
    const variants = VARIANT_MAP[mainLift];

    for (const variant of variants) {
      if (variant.pattern.test(combinedNormalized)) {
        variantTags.push(variant.tag);
      }
    }

    // Also check variation text alone for variants (in case exercise is "Bench Press"
    // and variation is "Close Grip" — the combined string handles it, but if someone
    // types just "CG" in variation column we need to catch it)
    if (variation) {
      const variationNormalized = normalize(variation);
      for (const variant of variants) {
        if (
          variant.pattern.test(variationNormalized) &&
          !variantTags.includes(variant.tag)
        ) {
          variantTags.push(variant.tag);
        }
      }
    }

    return { mainLift, mainTag, variantTags };
  }

  /** Parse all rows from a ProgramHierarchy into ParsedLiftRecords */
  parseHierarchy(
    hierarchy: ProgramHierarchy,
    settings: StatsSettings,
  ): ParsedLiftRecord[] {
    const records: ParsedLiftRecord[] = [];

    for (const blockData of hierarchy.blocks) {
      for (const weekData of blockData.weeks) {
        for (const dayData of weekData.days) {
          const exerciseCol = findColumn(dayData.columns, settings.exercise_label);
          if (!exerciseCol) continue;

          const setsCol = findColumn(dayData.columns, settings.sets_label);
          const repsCol = findColumn(dayData.columns, settings.reps_label);
          const weightCol = findColumn(dayData.columns, settings.weight_label);
          const rpeCol = settings.rpe_label
            ? findColumn(dayData.columns, settings.rpe_label)
            : undefined;
          const plannedRpeCol = settings.planned_rpe_label
            ? findColumn(dayData.columns, settings.planned_rpe_label)
            : undefined;
          const variationCol = settings.variation_label
            ? findColumn(dayData.columns, settings.variation_label)
            : undefined;

          for (const row of dayData.rows) {
            // Skip separator rows
            if (row.cells.__separator_label !== undefined) continue;

            const exerciseName = row.cells[exerciseCol.id]?.trim();
            if (!exerciseName) continue;

            const variation = variationCol
              ? row.cells[variationCol.id]?.trim() || undefined
              : undefined;

            const classification = this.classify(exerciseName, variation);
            if (!classification) continue;

            records.push({
              classification,
              exerciseName,
              sets: setsCol ? parseNumber(row.cells[setsCol.id]) : 0,
              reps: repsCol ? parseNumber(row.cells[repsCol.id]) : 0,
              weight: weightCol ? parseNumber(row.cells[weightCol.id]) : 0,
              rpe: rpeCol ? parseRpe(row.cells[rpeCol.id]) : 0,
              plannedRpe: plannedRpeCol ? parseRpe(row.cells[plannedRpeCol.id]) : 0,
              blockOrder: blockData.block.order,
              blockStartDate: blockData.block.start_date ?? null,
              weekNumber: weekData.week.week_number,
              dayNumber: dayData.day.day_number,
              weekDayIndex: dayData.day.week_day_index ?? null,
              sleepQuality: dayData.day.sleep_quality,
              sleepTime: dayData.day.sleep_time !== null ? Number(dayData.day.sleep_time) : null,
            });
          }
        }
      }
    }

    return records;
  }
}
