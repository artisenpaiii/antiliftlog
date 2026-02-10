"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
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

interface BlockCacheContextValue {
  loading: boolean;
  weeks: Week[];

  getDays(weekId: string): Day[];
  getColumns(dayId: string): DayColumn[];
  getRows(dayId: string): DayRow[];

  addWeek(insert: WeekInsert): Promise<Week | null>;
  deleteWeek(weekId: string): Promise<boolean>;
  duplicateWeek(sourceWeek: Week): Promise<Week | null>;

  deleteDay(dayId: string): Promise<boolean>;
  updateDay(dayId: string, update: DayUpdate): Promise<boolean>;
  cacheInsertDay(weekId: string, day: Day, columns: DayColumn[]): void;

  addColumn(dayId: string, insert: DayColumnInsert): Promise<DayColumn | null>;
  deleteColumn(dayId: string, colId: string): Promise<boolean>;
  reorderColumns(dayId: string, reordered: DayColumn[]): void;

  addRow(dayId: string, insert: DayRowInsert): Promise<DayRow | null>;
  deleteRow(dayId: string, rowId: string): Promise<boolean>;
  updateRowCells(
    dayId: string,
    rowId: string,
    cells: Record<string, string>,
  ): Promise<boolean>;
  reorderRows(dayId: string, reordered: DayRow[]): void;

  expandedDays: Set<string>;
  toggleDay(dayId: string): void;
}

const BlockCacheContext = createContext<BlockCacheContextValue | null>(null);

export function useBlockCache(): BlockCacheContextValue {
  const ctx = useContext(BlockCacheContext);
  if (!ctx) {
    throw new Error("useBlockCache must be used within a BlockCacheProvider");
  }
  return ctx;
}

function remapCellKeys(
  cells: Record<string, string>,
  columnIdMap: Map<string, string>,
): Record<string, string> {
  const remapped: Record<string, string> = {};
  for (const [oldColId, value] of Object.entries(cells)) {
    const newColId = columnIdMap.get(oldColId);
    if (newColId) remapped[newColId] = value;
  }
  return remapped;
}

interface BlockCacheProviderProps {
  blockId: string;
  children: ReactNode;
}

export function BlockCacheProvider({
  blockId,
  children,
}: BlockCacheProviderProps) {
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [daysByWeekId, setDaysByWeekId] = useState<Map<string, Day[]>>(
    new Map(),
  );
  const [columnsByDayId, setColumnsByDayId] = useState<
    Map<string, DayColumn[]>
  >(new Map());
  const [rowsByDayId, setRowsByDayId] = useState<Map<string, DayRow[]>>(
    new Map(),
  );

  // Track which blockId we fetched for to avoid stale updates
  const fetchIdRef = useRef(0);

  useEffect(() => {
    const fetchId = ++fetchIdRef.current;

    async function fetchAll() {
      setLoading(true);

      const supabase = createClient();
      const tables = createTables(supabase);

      // Round 1: fetch weeks
      const { data: weeksData } = await tables.weeks.findByBlockId(blockId);
      const loadedWeeks = weeksData ?? [];

      if (fetchId !== fetchIdRef.current) return;

      if (loadedWeeks.length === 0) {
        setWeeks([]);
        setDaysByWeekId(new Map());
        setColumnsByDayId(new Map());
        setRowsByDayId(new Map());
        setLoading(false);
        return;
      }

      // Round 2: fetch all days for all weeks in parallel
      const dayResults = await Promise.all(
        loadedWeeks.map((w) => tables.days.findByWeekId(w.id)),
      );

      if (fetchId !== fetchIdRef.current) return;

      const daysMap = new Map<string, Day[]>();
      const allDays: Day[] = [];
      for (let i = 0; i < loadedWeeks.length; i++) {
        const days = dayResults[i].data ?? [];
        daysMap.set(loadedWeeks[i].id, days);
        allDays.push(...days);
      }

      if (allDays.length === 0) {
        setWeeks(loadedWeeks);
        setDaysByWeekId(daysMap);
        setColumnsByDayId(new Map());
        setRowsByDayId(new Map());
        setLoading(false);
        return;
      }

      // Round 3: fetch all columns + rows for all days in parallel
      const colResults = await Promise.all(
        allDays.map((d) => tables.dayColumns.findByDayId(d.id)),
      );
      const rowResults = await Promise.all(
        allDays.map((d) => tables.dayRows.findByDayId(d.id)),
      );

      if (fetchId !== fetchIdRef.current) return;

      const colsMap = new Map<string, DayColumn[]>();
      const rowsMap = new Map<string, DayRow[]>();
      for (let i = 0; i < allDays.length; i++) {
        colsMap.set(allDays[i].id, colResults[i].data ?? []);
        rowsMap.set(allDays[i].id, rowResults[i].data ?? []);
      }

      setWeeks(loadedWeeks);
      setDaysByWeekId(daysMap);
      setColumnsByDayId(colsMap);
      setRowsByDayId(rowsMap);
      setLoading(false);
    }

    fetchAll();
  }, [blockId]);

  // --- Getters ---

  const getDays = useCallback(
    (weekId: string): Day[] => daysByWeekId.get(weekId) ?? [],
    [daysByWeekId],
  );

  const getColumns = useCallback(
    (dayId: string): DayColumn[] => columnsByDayId.get(dayId) ?? [],
    [columnsByDayId],
  );

  const getRows = useCallback(
    (dayId: string): DayRow[] => rowsByDayId.get(dayId) ?? [],
    [rowsByDayId],
  );

  // --- Week mutations ---

  const addWeek = useCallback(
    async (insert: WeekInsert): Promise<Week | null> => {
      const supabase = createClient();
      const tables = createTables(supabase);
      const { data, error } = await tables.weeks.create(insert);

      if (error || !data) {
        console.error("Failed to create week:", error);
        return null;
      }

      setWeeks((prev) => [...prev, data]);
      setDaysByWeekId((prev) => {
        const next = new Map(prev);
        next.set(data.id, []);
        return next;
      });
      return data;
    },
    [],
  );

  const deleteWeek = useCallback(
    async (weekId: string): Promise<boolean> => {
      const supabase = createClient();
      const tables = createTables(supabase);
      const { error } = await tables.weeks.delete(weekId);

      if (error) {
        console.error("Failed to delete week:", error);
        return false;
      }

      // Remove week and all associated days/columns/rows from cache
      const days = daysByWeekId.get(weekId) ?? [];
      setWeeks((prev) => prev.filter((w) => w.id !== weekId));
      setDaysByWeekId((prev) => {
        const next = new Map(prev);
        next.delete(weekId);
        return next;
      });
      setColumnsByDayId((prev) => {
        const next = new Map(prev);
        for (const d of days) next.delete(d.id);
        return next;
      });
      setRowsByDayId((prev) => {
        const next = new Map(prev);
        for (const d of days) next.delete(d.id);
        return next;
      });
      return true;
    },
    [daysByWeekId],
  );

  const duplicateWeek = useCallback(
    async (sourceWeek: Week): Promise<Week | null> => {
      const supabase = createClient();
      const tables = createTables(supabase);

      // Read source data from cache
      const sourceDays = daysByWeekId.get(sourceWeek.id) ?? [];

      // Create new week
      const { data: newWeek, error: weekError } = await tables.weeks.create({
        block_id: sourceWeek.block_id,
        week_number: weeks.length + 1,
      });

      if (weekError || !newWeek) {
        console.error("Failed to duplicate week:", weekError);
        return null;
      }

      if (sourceDays.length === 0) {
        setWeeks((prev) => [...prev, newWeek]);
        setDaysByWeekId((prev) => {
          const next = new Map(prev);
          next.set(newWeek.id, []);
          return next;
        });
        return newWeek;
      }

      const newDays: Day[] = [];
      const newColsByDayId = new Map<string, DayColumn[]>();
      const newRowsByDayId = new Map<string, DayRow[]>();

      for (const day of sourceDays) {
        const sourceColumns = columnsByDayId.get(day.id) ?? [];
        const sourceRows = rowsByDayId.get(day.id) ?? [];

        const { data: newDay } = await tables.days.create({
          week_id: newWeek.id,
          day_number: day.day_number,
          name: day.name,
          week_day_index: day.week_day_index,
        });
        if (!newDay) continue;

        newDays.push(newDay);

        // Clone columns
        const columnIdMap = new Map<string, string>();
        if (sourceColumns.length > 0) {
          const { data: newCols } = await tables.dayColumns.createMany(
            sourceColumns.map((col) => ({
              day_id: newDay.id,
              label: col.label,
              order: col.order,
            })),
          );
          if (newCols) {
            for (let i = 0; i < sourceColumns.length; i++) {
              columnIdMap.set(sourceColumns[i].id, newCols[i].id);
            }
            newColsByDayId.set(newDay.id, newCols);
          } else {
            newColsByDayId.set(newDay.id, []);
          }
        } else {
          newColsByDayId.set(newDay.id, []);
        }

        // Clone rows with remapped cells
        if (sourceRows.length > 0) {
          const { data: newRows } = await tables.dayRows.createMany(
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
      }

      // Update cache with all new data
      setWeeks((prev) => [...prev, newWeek]);
      setDaysByWeekId((prev) => {
        const next = new Map(prev);
        next.set(newWeek.id, newDays);
        return next;
      });
      setColumnsByDayId((prev) => {
        const next = new Map(prev);
        for (const [dayId, cols] of newColsByDayId) {
          next.set(dayId, cols);
        }
        return next;
      });
      setRowsByDayId((prev) => {
        const next = new Map(prev);
        for (const [dayId, rows] of newRowsByDayId) {
          next.set(dayId, rows);
        }
        return next;
      });

      return newWeek;
    },
    [weeks.length, daysByWeekId, columnsByDayId, rowsByDayId],
  );

  // --- Day mutations ---

  const deleteDay = useCallback(
    async (dayId: string): Promise<boolean> => {
      const supabase = createClient();
      const tables = createTables(supabase);
      const { error } = await tables.days.delete(dayId);

      if (error) {
        console.error("Failed to delete day:", error);
        return false;
      }

      // Find which week this day belongs to and remove from cache
      setDaysByWeekId((prev) => {
        const next = new Map(prev);
        for (const [weekId, days] of next) {
          const filtered = days.filter((d) => d.id !== dayId);
          if (filtered.length !== days.length) {
            next.set(weekId, filtered);
            break;
          }
        }
        return next;
      });
      setColumnsByDayId((prev) => {
        const next = new Map(prev);
        next.delete(dayId);
        return next;
      });
      setRowsByDayId((prev) => {
        const next = new Map(prev);
        next.delete(dayId);
        return next;
      });
      return true;
    },
    [],
  );

  const updateDay = useCallback(
    async (dayId: string, update: DayUpdate): Promise<boolean> => {
      const supabase = createClient();
      const tables = createTables(supabase);
      const { data, error } = await tables.days.update(dayId, update);

      if (error || !data) {
        console.error("Failed to update day:", error);
        return false;
      }

      setDaysByWeekId((prev) => {
        const next = new Map(prev);
        for (const [weekId, days] of next) {
          const idx = days.findIndex((d) => d.id === dayId);
          if (idx !== -1) {
            const updated = [...days];
            updated[idx] = data;
            next.set(weekId, updated);
            break;
          }
        }
        return next;
      });
      return true;
    },
    [],
  );

  const cacheInsertDay = useCallback(
    (weekId: string, day: Day, columns: DayColumn[]): void => {
      setDaysByWeekId((prev) => {
        const next = new Map(prev);
        const existing = next.get(weekId) ?? [];
        next.set(weekId, [...existing, day]);
        return next;
      });
      setColumnsByDayId((prev) => {
        const next = new Map(prev);
        next.set(day.id, columns);
        return next;
      });
      setRowsByDayId((prev) => {
        const next = new Map(prev);
        next.set(day.id, []);
        return next;
      });
    },
    [],
  );

  // --- Column mutations ---

  const addColumn = useCallback(
    async (
      dayId: string,
      insert: DayColumnInsert,
    ): Promise<DayColumn | null> => {
      const supabase = createClient();
      const tables = createTables(supabase);
      const { data, error } = await tables.dayColumns.create(insert);

      if (error || !data) {
        console.error("Failed to add column:", error);
        return null;
      }

      setColumnsByDayId((prev) => {
        const next = new Map(prev);
        const existing = next.get(dayId) ?? [];
        next.set(dayId, [...existing, data]);
        return next;
      });
      return data;
    },
    [],
  );

  const deleteColumn = useCallback(
    async (dayId: string, colId: string): Promise<boolean> => {
      const supabase = createClient();
      const tables = createTables(supabase);
      const { error } = await tables.dayColumns.delete(colId);

      if (error) {
        console.error("Failed to delete column:", error);
        return false;
      }

      // Remove column key from all rows' cells for this day
      const currentRows = rowsByDayId.get(dayId) ?? [];
      const rowsWithCol = currentRows.filter((r) => colId in r.cells);
      await Promise.all(
        rowsWithCol.map((r) => {
          const updated = { ...r.cells };
          delete updated[colId];
          return tables.dayRows.updateCells(r.id, updated);
        }),
      );

      setColumnsByDayId((prev) => {
        const next = new Map(prev);
        const existing = next.get(dayId) ?? [];
        next.set(
          dayId,
          existing.filter((c) => c.id !== colId),
        );
        return next;
      });
      setRowsByDayId((prev) => {
        const next = new Map(prev);
        const existing = next.get(dayId) ?? [];
        next.set(
          dayId,
          existing.map((r) => {
            if (!(colId in r.cells)) return r;
            const cells = { ...r.cells };
            delete cells[colId];
            return { ...r, cells };
          }),
        );
        return next;
      });
      return true;
    },
    [rowsByDayId],
  );

  const reorderColumns = useCallback(
    (dayId: string, reordered: DayColumn[]): void => {
      // Optimistic update
      setColumnsByDayId((prev) => {
        const next = new Map(prev);
        next.set(dayId, reordered);
        return next;
      });

      // Persist async
      const supabase = createClient();
      const tables = createTables(supabase);
      const updates = reordered
        .map((col, i) => ({ id: col.id, order: i }))
        .filter((u, i) => u.order !== reordered[i].order || true);

      Promise.all(
        updates.map((u) => tables.dayColumns.update(u.id, { order: u.order })),
      ).catch((err) => console.error("Failed to persist column order:", err));
    },
    [],
  );

  // --- Row mutations ---

  const addRow = useCallback(
    async (dayId: string, insert: DayRowInsert): Promise<DayRow | null> => {
      const supabase = createClient();
      const tables = createTables(supabase);
      const { data, error } = await tables.dayRows.create(insert);

      if (error || !data) {
        console.error("Failed to add row:", error);
        return null;
      }

      setRowsByDayId((prev) => {
        const next = new Map(prev);
        const existing = next.get(dayId) ?? [];
        next.set(dayId, [...existing, data]);
        return next;
      });
      return data;
    },
    [],
  );

  const deleteRow = useCallback(
    async (dayId: string, rowId: string): Promise<boolean> => {
      const supabase = createClient();
      const tables = createTables(supabase);
      const { error } = await tables.dayRows.delete(rowId);

      if (error) {
        console.error("Failed to delete row:", error);
        return false;
      }

      setRowsByDayId((prev) => {
        const next = new Map(prev);
        const existing = next.get(dayId) ?? [];
        next.set(
          dayId,
          existing.filter((r) => r.id !== rowId),
        );
        return next;
      });
      return true;
    },
    [],
  );

  const updateRowCells = useCallback(
    async (
      dayId: string,
      rowId: string,
      cells: Record<string, string>,
    ): Promise<boolean> => {
      const supabase = createClient();
      const tables = createTables(supabase);
      const { error } = await tables.dayRows.updateCells(rowId, cells);

      if (error) {
        console.error("Failed to save cells:", error);
        return false;
      }

      setRowsByDayId((prev) => {
        const next = new Map(prev);
        const existing = next.get(dayId) ?? [];
        next.set(
          dayId,
          existing.map((r) => (r.id === rowId ? { ...r, cells } : r)),
        );
        return next;
      });
      return true;
    },
    [],
  );

  // --- UI state ---

  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const toggleDay = useCallback((dayId: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) {
        next.delete(dayId);
      } else {
        next.add(dayId);
      }
      return next;
    });
  }, []);

  const reorderRows = useCallback(
    (dayId: string, reordered: DayRow[]): void => {
      // Optimistic update
      setRowsByDayId((prev) => {
        const next = new Map(prev);
        next.set(dayId, reordered);
        return next;
      });

      // Persist async
      const supabase = createClient();
      const tables = createTables(supabase);
      const updates = reordered.map((row, i) => ({ id: row.id, order: i }));

      Promise.all(
        updates.map((u) => tables.dayRows.update(u.id, { order: u.order })),
      ).catch((err) => console.error("Failed to persist row order:", err));
    },
    [],
  );

  const value: BlockCacheContextValue = {
    loading,
    weeks,
    getDays,
    getColumns,
    getRows,
    addWeek,
    deleteWeek,
    duplicateWeek,
    deleteDay,
    updateDay,
    cacheInsertDay,
    addColumn,
    deleteColumn,
    reorderColumns,
    addRow,
    deleteRow,
    updateRowCells,
    reorderRows,
    expandedDays,
    toggleDay,
  };

  return (
    <BlockCacheContext.Provider value={value}>
      {children}
    </BlockCacheContext.Provider>
  );
}
