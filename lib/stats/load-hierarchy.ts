import type { Tables } from "@/lib/db";
import type { StatsSettings } from "@/lib/types/database";
import type { ProgramHierarchy } from "./types";

interface LoadHierarchyResult {
  hierarchy: ProgramHierarchy;
  columnLabels: string[];
  settings: StatsSettings | null;
}

export async function loadProgramHierarchy(tables: Tables, programId: string): Promise<LoadHierarchyResult> {
  const [settingsResult, blocksResult] = await Promise.all([
    tables.statsSettings.findByProgramId(programId),
    tables.blocks.findByProgramId(programId),
  ]);

  const settings = settingsResult.data ?? null;
  const blocks = blocksResult.data ?? [];

  const blockDataArr: ProgramHierarchy["blocks"] = [];
  const allLabels = new Set<string>();

  for (const block of blocks) {
    const { data: weeks } = await tables.weeks.findByBlockId(block.id);
    const weekDataArr: ProgramHierarchy["blocks"][number]["weeks"] = [];

    for (const week of weeks ?? []) {
      const { data: days } = await tables.days.findByWeekId(week.id);
      const dayDataArr: ProgramHierarchy["blocks"][number]["weeks"][number]["days"] = [];

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

  const hierarchy: ProgramHierarchy = { blocks: blockDataArr };
  const columnLabels = Array.from(allLabels).sort();

  return { hierarchy, columnLabels, settings };
}
