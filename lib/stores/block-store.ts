import type { Tables } from "@/lib/db";
import type {
  Week,
  WeekInsert,
  Day,
  DayUpdate,
  DayColumn,
  DayColumnInsert,
  DayRow,
  DayRowInsert,
} from "@/lib/types/database";
import type { ImportDayData, ImportWeekData } from "@/lib/types/import";

export interface BlockStoreSnapshot {
  loading: boolean;
  weeks: Week[];
  daysByWeekId: Map<string, Day[]>;
  columnsByDayId: Map<string, DayColumn[]>;
  rowsByDayId: Map<string, DayRow[]>;
}

type Listener = () => void;

function remapCellKeys(
  cells: Record<string, string>,
  columnIdMap: Map<string, string>,
): Record<string, string> {
  const remapped: Record<string, string> = {};
  for (const [oldColId, value] of Object.entries(cells)) {
    const newColId = columnIdMap.get(oldColId);
    if (newColId) {
      remapped[newColId] = value;
    } else if (oldColId.startsWith("__")) {
      // Preserve special keys (e.g. __separator_label)
      remapped[oldColId] = value;
    }
  }
  return remapped;
}

export class BlockStore {
  private _loading = true;
  private _weeks: Week[] = [];
  private _daysByWeekId = new Map<string, Day[]>();
  private _columnsByDayId = new Map<string, DayColumn[]>();
  private _rowsByDayId = new Map<string, DayRow[]>();
  private _fetchId = 0;

  private _listeners = new Set<Listener>();
  private _snapshot: BlockStoreSnapshot | null = null;

  constructor(
    private readonly blockId: string,
    private readonly tables: Tables,
  ) {}

  // ==================== Subscription API ====================

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  getSnapshot(): BlockStoreSnapshot {
    if (!this._snapshot) {
      this._snapshot = {
        loading: this._loading,
        weeks: this._weeks,
        daysByWeekId: this._daysByWeekId,
        columnsByDayId: this._columnsByDayId,
        rowsByDayId: this._rowsByDayId,
      };
    }
    return this._snapshot;
  }

  private notify(): void {
    this._snapshot = null;
    for (const listener of this._listeners) {
      listener();
    }
  }

  // ==================== Initial Load ====================

  async load(): Promise<void> {
    const fetchId = ++this._fetchId;
    this._loading = true;
    this.notify();

    // Round 1: weeks
    const { data: weeksData } = await this.tables.weeks.findByBlockId(this.blockId);
    const loadedWeeks = weeksData ?? [];

    if (fetchId !== this._fetchId) return;

    if (loadedWeeks.length === 0) {
      this._weeks = [];
      this._daysByWeekId = new Map();
      this._columnsByDayId = new Map();
      this._rowsByDayId = new Map();
      this._loading = false;
      this.notify();
      return;
    }

    // Round 2: days
    const weekIds = loadedWeeks.map((w) => w.id);
    const { data: allDaysData } = await this.tables.days.findByWeekIds(weekIds);

    if (fetchId !== this._fetchId) return;

    const allDays = allDaysData ?? [];
    const daysMap = new Map<string, Day[]>();
    for (const week of loadedWeeks) daysMap.set(week.id, []);
    for (const day of allDays) {
      const arr = daysMap.get(day.week_id);
      if (arr) arr.push(day);
    }

    if (allDays.length === 0) {
      this._weeks = loadedWeeks;
      this._daysByWeekId = daysMap;
      this._columnsByDayId = new Map();
      this._rowsByDayId = new Map();
      this._loading = false;
      this.notify();
      return;
    }

    // Round 3: columns + rows in parallel
    const dayIds = allDays.map((d) => d.id);
    const [{ data: allColsData }, { data: allRowsData }] = await Promise.all([
      this.tables.dayColumns.findByDayIds(dayIds),
      this.tables.dayRows.findByDayIds(dayIds),
    ]);

    if (fetchId !== this._fetchId) return;

    const colsMap = new Map<string, DayColumn[]>();
    const rowsMap = new Map<string, DayRow[]>();
    for (const day of allDays) {
      colsMap.set(day.id, []);
      rowsMap.set(day.id, []);
    }
    for (const col of allColsData ?? []) {
      colsMap.get(col.day_id)?.push(col);
    }
    for (const row of allRowsData ?? []) {
      rowsMap.get(row.day_id)?.push(row);
    }

    this._weeks = loadedWeeks;
    this._daysByWeekId = daysMap;
    this._columnsByDayId = colsMap;
    this._rowsByDayId = rowsMap;
    this._loading = false;
    this.notify();
  }

  // ==================== Getters ====================

  getDays(weekId: string): Day[] {
    return this._daysByWeekId.get(weekId) ?? [];
  }

  getColumns(dayId: string): DayColumn[] {
    return this._columnsByDayId.get(dayId) ?? [];
  }

  getRows(dayId: string): DayRow[] {
    return this._rowsByDayId.get(dayId) ?? [];
  }

  // ==================== Week Mutations ====================

  async addWeek(insert: WeekInsert): Promise<Week | null> {
    const { data, error } = await this.tables.weeks.create(insert);

    if (error || !data) {
      console.error("Failed to create week:", error);
      return null;
    }

    this._weeks = [...this._weeks, data];
    this._daysByWeekId = new Map(this._daysByWeekId).set(data.id, []);
    this.notify();
    return data;
  }

  async deleteWeek(weekId: string): Promise<boolean> {
    const { error } = await this.tables.weeks.delete(weekId);

    if (error) {
      console.error("Failed to delete week:", error);
      return false;
    }

    const days = this._daysByWeekId.get(weekId) ?? [];
    this._weeks = this._weeks.filter((w) => w.id !== weekId);

    const nextDays = new Map(this._daysByWeekId);
    nextDays.delete(weekId);
    this._daysByWeekId = nextDays;

    const nextCols = new Map(this._columnsByDayId);
    const nextRows = new Map(this._rowsByDayId);
    for (const d of days) {
      nextCols.delete(d.id);
      nextRows.delete(d.id);
    }
    this._columnsByDayId = nextCols;
    this._rowsByDayId = nextRows;

    this.notify();
    return true;
  }

  async duplicateWeek(sourceWeek: Week): Promise<Week | null> {
    const sourceDays = this._daysByWeekId.get(sourceWeek.id) ?? [];

    const { data: newWeek, error: weekError } = await this.tables.weeks.create({
      block_id: sourceWeek.block_id,
      week_number: this._weeks.length + 1,
    });

    if (weekError || !newWeek) {
      console.error("Failed to duplicate week:", weekError);
      return null;
    }

    if (sourceDays.length === 0) {
      this._weeks = [...this._weeks, newWeek];
      this._daysByWeekId = new Map(this._daysByWeekId).set(newWeek.id, []);
      this.notify();
      return newWeek;
    }

    const newDayResults = await Promise.all(
      sourceDays.map((day) =>
        this.tables.days.create({
          week_id: newWeek.id,
          day_number: day.day_number,
          name: day.name,
          week_day_index: day.week_day_index,
        }),
      ),
    );

    const newDays: Day[] = [];
    const newColsByDayId = new Map<string, DayColumn[]>();
    const newRowsByDayId = new Map<string, DayRow[]>();

    await Promise.all(
      newDayResults.map(async ({ data: newDay }, i) => {
        if (!newDay) return;
        newDays.push(newDay);

        const sourceColumns = this._columnsByDayId.get(sourceDays[i].id) ?? [];
        const sourceRows = this._rowsByDayId.get(sourceDays[i].id) ?? [];

        const columnIdMap = new Map<string, string>();
        if (sourceColumns.length > 0) {
          const { data: newCols } = await this.tables.dayColumns.createMany(
            sourceColumns.map((col) => ({
              day_id: newDay.id,
              label: col.label,
              order: col.order,
            })),
          );
          if (newCols) {
            for (let j = 0; j < sourceColumns.length; j++) {
              columnIdMap.set(sourceColumns[j].id, newCols[j].id);
            }
            newColsByDayId.set(newDay.id, newCols);
          } else {
            newColsByDayId.set(newDay.id, []);
          }
        } else {
          newColsByDayId.set(newDay.id, []);
        }

        if (sourceRows.length > 0) {
          const { data: newRows } = await this.tables.dayRows.createMany(
            sourceRows.map((row) => ({
              day_id: newDay.id,
              order: row.order,
              cells: remapCellKeys(row.cells, columnIdMap),
            })),
          );
          newRowsByDayId.set(newDay.id, newRows ?? []);
        } else {
          newRowsByDayId.set(newDay.id, []);
        }
      }),
    );

    this._weeks = [...this._weeks, newWeek];
    const nextDays = new Map(this._daysByWeekId);
    nextDays.set(newWeek.id, newDays);
    this._daysByWeekId = nextDays;

    const nextCols = new Map(this._columnsByDayId);
    for (const [dayId, cols] of newColsByDayId) {
      nextCols.set(dayId, cols);
    }
    this._columnsByDayId = nextCols;

    const nextRows = new Map(this._rowsByDayId);
    for (const [dayId, rows] of newRowsByDayId) {
      nextRows.set(dayId, rows);
    }
    this._rowsByDayId = nextRows;

    this.notify();
    return newWeek;
  }

  async importWeek(weekData: ImportWeekData): Promise<Week | null> {
    const { data: newWeek, error: weekError } = await this.tables.weeks.create({
      block_id: this.blockId,
      week_number: this._weeks.length + 1,
    });

    if (weekError || !newWeek) {
      console.error("Failed to import week:", weekError);
      return null;
    }

    const newDayResults = await Promise.all(
      weekData.days.map((dayData, di) =>
        this.tables.days.create({
          week_id: newWeek.id,
          day_number: di + 1,
          name: dayData.name ?? null,
          week_day_index: dayData.week_day_index ?? null,
        }),
      ),
    );

    const newDays: Day[] = [];
    const newColsByDayId = new Map<string, DayColumn[]>();
    const newRowsByDayId = new Map<string, DayRow[]>();

    await Promise.all(
      newDayResults.map(async ({ data: newDay }, di) => {
        if (!newDay) return;
        newDays.push(newDay);

        const dayData = weekData.days[di];
        const columnInserts = dayData.columns.map((label, i) => ({
          day_id: newDay.id,
          label,
          order: i,
        }));
        const { data: newCols } = await this.tables.dayColumns.createMany(columnInserts);
        const cols = newCols ?? [];
        newColsByDayId.set(newDay.id, cols);

        if (dayData.rows.length > 0 && cols.length > 0) {
          const rowInserts = dayData.rows.map((cells, i) => {
            const cellMap: Record<string, string> = {};
            for (let j = 0; j < cols.length; j++) {
              cellMap[cols[j].id] = cells[j] ?? "";
            }
            return { day_id: newDay.id, order: i, cells: cellMap };
          });
          const { data: createdRows } = await this.tables.dayRows.createMany(rowInserts);
          newRowsByDayId.set(newDay.id, createdRows ?? []);
        } else {
          newRowsByDayId.set(newDay.id, []);
        }
      }),
    );

    this._weeks = [...this._weeks, newWeek];
    const nextDays = new Map(this._daysByWeekId);
    nextDays.set(newWeek.id, newDays);
    this._daysByWeekId = nextDays;

    const nextCols = new Map(this._columnsByDayId);
    for (const [dayId, cols] of newColsByDayId) nextCols.set(dayId, cols);
    this._columnsByDayId = nextCols;

    const nextRows = new Map(this._rowsByDayId);
    for (const [dayId, rows] of newRowsByDayId) nextRows.set(dayId, rows);
    this._rowsByDayId = nextRows;

    this.notify();
    return newWeek;
  }

  async importDay(weekId: string, dayData: ImportDayData): Promise<Day | null> {
    const existingDays = this._daysByWeekId.get(weekId) ?? [];
    const { data: newDay, error: dayError } = await this.tables.days.create({
      week_id: weekId,
      day_number: existingDays.length + 1,
      name: dayData.name ?? null,
      week_day_index: dayData.week_day_index ?? null,
    });

    if (dayError || !newDay) {
      console.error("Failed to import day:", dayError);
      return null;
    }

    const columnInserts = dayData.columns.map((label, i) => ({
      day_id: newDay.id,
      label,
      order: i,
    }));

    const { data: newCols } = await this.tables.dayColumns.createMany(columnInserts);
    const cols = newCols ?? [];

    let newRows: DayRow[] = [];
    if (dayData.rows.length > 0 && cols.length > 0) {
      const rowInserts = dayData.rows.map((cells, i) => {
        const cellMap: Record<string, string> = {};
        for (let j = 0; j < cols.length; j++) {
          cellMap[cols[j].id] = cells[j] ?? "";
        }
        return { day_id: newDay.id, order: i, cells: cellMap };
      });
      const { data: createdRows } = await this.tables.dayRows.createMany(rowInserts);
      newRows = createdRows ?? [];
    }

    const nextDays = new Map(this._daysByWeekId);
    const existing = nextDays.get(weekId) ?? [];
    nextDays.set(weekId, [...existing, newDay]);
    this._daysByWeekId = nextDays;

    this._columnsByDayId = new Map(this._columnsByDayId).set(newDay.id, cols);
    this._rowsByDayId = new Map(this._rowsByDayId).set(newDay.id, newRows);

    this.notify();
    return newDay;
  }

  // ==================== Day Mutations ====================

  async deleteDay(dayId: string): Promise<boolean> {
    const { error } = await this.tables.days.delete(dayId);

    if (error) {
      console.error("Failed to delete day:", error);
      return false;
    }

    const nextDays = new Map(this._daysByWeekId);
    for (const [weekId, days] of nextDays) {
      const filtered = days.filter((d) => d.id !== dayId);
      if (filtered.length !== days.length) {
        nextDays.set(weekId, filtered);
        break;
      }
    }
    this._daysByWeekId = nextDays;

    const nextCols = new Map(this._columnsByDayId);
    nextCols.delete(dayId);
    this._columnsByDayId = nextCols;

    const nextRows = new Map(this._rowsByDayId);
    nextRows.delete(dayId);
    this._rowsByDayId = nextRows;

    this.notify();
    return true;
  }

  async updateDay(dayId: string, update: DayUpdate): Promise<boolean> {
    const { data, error } = await this.tables.days.update(dayId, update);

    if (error || !data) {
      console.error("Failed to update day:", error);
      return false;
    }

    const nextDays = new Map(this._daysByWeekId);
    for (const [weekId, days] of nextDays) {
      const idx = days.findIndex((d) => d.id === dayId);
      if (idx !== -1) {
        const updated = [...days];
        updated[idx] = data;
        nextDays.set(weekId, updated);
        break;
      }
    }
    this._daysByWeekId = nextDays;

    this.notify();
    return true;
  }

  cacheInsertDay(weekId: string, day: Day, columns: DayColumn[]): void {
    const nextDays = new Map(this._daysByWeekId);
    const existing = nextDays.get(weekId) ?? [];
    nextDays.set(weekId, [...existing, day]);
    this._daysByWeekId = nextDays;

    this._columnsByDayId = new Map(this._columnsByDayId).set(day.id, columns);
    this._rowsByDayId = new Map(this._rowsByDayId).set(day.id, []);
    this.notify();
  }

  // ==================== Column Mutations ====================

  async addColumn(dayId: string, insert: DayColumnInsert): Promise<DayColumn | null> {
    const { data, error } = await this.tables.dayColumns.create(insert);

    if (error || !data) {
      console.error("Failed to add column:", error);
      return null;
    }

    const nextCols = new Map(this._columnsByDayId);
    const existing = nextCols.get(dayId) ?? [];
    nextCols.set(dayId, [...existing, data]);
    this._columnsByDayId = nextCols;

    this.notify();
    return data;
  }

  async deleteColumn(dayId: string, colId: string): Promise<boolean> {
    const { error } = await this.tables.dayColumns.delete(colId);

    if (error) {
      console.error("Failed to delete column:", error);
      return false;
    }

    // Remove column key from all rows' cells for this day
    const currentRows = this._rowsByDayId.get(dayId) ?? [];
    const rowsWithCol = currentRows.filter((r) => colId in r.cells);
    await Promise.all(
      rowsWithCol.map((r) => {
        const updated = { ...r.cells };
        delete updated[colId];
        return this.tables.dayRows.updateCells(r.id, updated);
      }),
    );

    const nextCols = new Map(this._columnsByDayId);
    const existing = nextCols.get(dayId) ?? [];
    nextCols.set(dayId, existing.filter((c) => c.id !== colId));
    this._columnsByDayId = nextCols;

    const nextRows = new Map(this._rowsByDayId);
    const existingRows = nextRows.get(dayId) ?? [];
    nextRows.set(
      dayId,
      existingRows.map((r) => {
        if (!(colId in r.cells)) return r;
        const cells = { ...r.cells };
        delete cells[colId];
        return { ...r, cells };
      }),
    );
    this._rowsByDayId = nextRows;

    this.notify();
    return true;
  }

  reorderColumns(dayId: string, reordered: DayColumn[], onError?: () => void): void {
    // Optimistic update
    this._columnsByDayId = new Map(this._columnsByDayId).set(dayId, reordered);
    this.notify();

    // Persist async
    const updates = reordered.map((col, i) => ({ id: col.id, order: i }));
    Promise.all(
      updates.map((u) => this.tables.dayColumns.update(u.id, { order: u.order })),
    ).catch((err) => {
      console.error("Failed to persist column order:", err);
      onError?.();
    });
  }

  // ==================== Row Mutations ====================

  async addRow(dayId: string, insert: DayRowInsert): Promise<DayRow | null> {
    const { data, error } = await this.tables.dayRows.create(insert);

    if (error || !data) {
      console.error("Failed to add row:", error);
      return null;
    }

    const nextRows = new Map(this._rowsByDayId);
    const existing = nextRows.get(dayId) ?? [];
    nextRows.set(dayId, [...existing, data]);
    this._rowsByDayId = nextRows;

    this.notify();
    return data;
  }

  async deleteRow(dayId: string, rowId: string): Promise<boolean> {
    const { error } = await this.tables.dayRows.delete(rowId);

    if (error) {
      console.error("Failed to delete row:", error);
      return false;
    }

    const nextRows = new Map(this._rowsByDayId);
    const existing = nextRows.get(dayId) ?? [];
    nextRows.set(dayId, existing.filter((r) => r.id !== rowId));
    this._rowsByDayId = nextRows;

    this.notify();
    return true;
  }

  async updateRowCells(
    dayId: string,
    rowId: string,
    cells: Record<string, string>,
  ): Promise<boolean> {
    const { error } = await this.tables.dayRows.updateCells(rowId, cells);

    if (error) {
      console.error("Failed to save cells:", error);
      return false;
    }

    const nextRows = new Map(this._rowsByDayId);
    const existing = nextRows.get(dayId) ?? [];
    nextRows.set(
      dayId,
      existing.map((r) => (r.id === rowId ? { ...r, cells } : r)),
    );
    this._rowsByDayId = nextRows;

    this.notify();
    return true;
  }

  reorderRows(dayId: string, reordered: DayRow[], onError?: () => void): void {
    // Optimistic update
    this._rowsByDayId = new Map(this._rowsByDayId).set(dayId, reordered);
    this.notify();

    // Persist async
    const updates = reordered.map((row, i) => ({ id: row.id, order: i }));
    Promise.all(
      updates.map((u) => this.tables.dayRows.update(u.id, { order: u.order })),
    ).catch((err) => {
      console.error("Failed to persist row order:", err);
      onError?.();
    });
  }
}
