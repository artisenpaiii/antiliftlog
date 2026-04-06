import type { Tables } from "@/lib/db";
import type {
  Block,
  Week,
  Day,
  DayColumn,
  DayRow,
} from "@/lib/types/database";
import type { ImportDayData, ImportWeekData, ImportBlockData } from "@/lib/types/import";

export interface ImportDayResult {
  day: Day;
  columns: DayColumn[];
  rows: DayRow[];
}

export interface ImportWeekResult {
  week: Week;
  days: ImportDayResult[];
}

export interface ImportBlockResult {
  block: Block;
  weeks: ImportWeekResult[];
}

export class ImportEngine {
  constructor(private readonly tables: Tables) {}

  async importDay(
    weekId: string,
    dayNumber: number,
    dayData: ImportDayData,
  ): Promise<ImportDayResult> {
    const { data: newDay, error: dayError } = await this.tables.days.create({
      week_id: weekId,
      day_number: dayNumber,
      name: dayData.name ?? null,
      week_day_index: dayData.week_day_index ?? null,
    });

    if (dayError || !newDay) {
      throw new Error("Failed to create day");
    }

    const columnInserts = dayData.columns.map((label, i) => ({
      day_id: newDay.id,
      label,
      order: i,
    }));

    const { data: newCols } = await this.tables.dayColumns.createMany(columnInserts);
    const cols = newCols ?? [];

    let rows: DayRow[] = [];
    const rowInserts = dayData.rows
      .map((row, i) => {
        if (Array.isArray(row)) {
          if (cols.length === 0) return null;
          const cellMap: Record<string, string> = {};
          for (let j = 0; j < cols.length; j++) {
            cellMap[cols[j].id] = row[j] ?? "";
          }
          return { day_id: newDay.id, order: i, cells: cellMap };
        }
        return {
          day_id: newDay.id,
          order: i,
          cells: { __separator_label: row.separator },
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rowInserts.length > 0) {
      const { data: createdRows } = await this.tables.dayRows.createMany(rowInserts);
      rows = createdRows ?? [];
    }

    return { day: newDay, columns: cols, rows };
  }

  async importWeek(
    blockId: string,
    weekNumber: number,
    weekData: ImportWeekData,
  ): Promise<ImportWeekResult> {
    const { data: newWeek, error: weekError } = await this.tables.weeks.create({
      block_id: blockId,
      week_number: weekNumber,
    });

    if (weekError || !newWeek) {
      throw new Error("Failed to create week");
    }

    const dayResults = await Promise.all(
      weekData.days.map((dayData, di) =>
        this.importDay(newWeek.id, di + 1, dayData),
      ),
    );

    return { week: newWeek, days: dayResults };
  }

  async importBlock(
    programId: string,
    blockOrder: number,
    blockData: ImportBlockData,
  ): Promise<ImportBlockResult> {
    const { data: newBlock, error: blockError } = await this.tables.blocks.create({
      program_id: programId,
      name: blockData.name,
      order: blockOrder,
      start_date: blockData.start_date ?? null,
    });

    if (blockError || !newBlock) {
      throw new Error("Failed to create block");
    }

    const weekResults: ImportWeekResult[] = [];
    for (let wi = 0; wi < blockData.weeks.length; wi++) {
      const result = await this.importWeek(newBlock.id, wi + 1, blockData.weeks[wi]);
      weekResults.push(result);
    }

    return { block: newBlock, weeks: weekResults };
  }
}
