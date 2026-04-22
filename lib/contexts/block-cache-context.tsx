"use client";

import {
  createContext,
  useContext,
  useRef,
  useSyncExternalStore,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import { createClient, createRealtimeClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import { BlockStore } from "@/lib/stores/block-store";
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

interface BlockCacheContextValue {
  loading: boolean;
  weeks: Week[];

  getDays(weekId: string): Day[];
  getColumns(dayId: string): DayColumn[];
  getRows(dayId: string): DayRow[];

  addWeek(insert: WeekInsert): Promise<Week | null>;
  deleteWeek(weekId: string): Promise<boolean>;
  duplicateWeek(sourceWeek: Week): Promise<Week | null>;
  importWeek(weekData: ImportWeekData): Promise<Week | null>;
  importDay(weekId: string, dayData: ImportDayData): Promise<Day | null>;

  deleteDay(dayId: string): Promise<boolean>;
  updateDay(dayId: string, update: DayUpdate): Promise<boolean>;
  cacheInsertDay(weekId: string, day: Day, columns: DayColumn[]): void;

  addColumn(dayId: string, insert: DayColumnInsert): Promise<DayColumn | null>;
  deleteColumn(dayId: string, colId: string): Promise<boolean>;
  reorderColumns(dayId: string, reordered: DayColumn[], onError?: () => void): void;

  addRow(dayId: string, insert: DayRowInsert): Promise<DayRow | null>;
  deleteRow(dayId: string, rowId: string): Promise<boolean>;
  updateRowCells(
    dayId: string,
    rowId: string,
    cells: Record<string, string>,
  ): Promise<boolean>;
  bulkUpdateRowCells(
    dayId: string,
    updates: { rowId: string; cells: Record<string, string> }[],
  ): Promise<boolean>;
  reorderRows(dayId: string, reordered: DayRow[], onError?: () => void): void;

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

interface BlockCacheProviderProps {
  blockId: string;
  enableRealtime?: boolean;
  children: ReactNode;
}

export function BlockCacheProvider({
  blockId,
  enableRealtime = false,
  children,
}: BlockCacheProviderProps) {
  // Create store once per blockId, recreate when blockId changes.
  // Store the supabase client alongside so it's reused for realtime (same instance = same auth state).
  const storeRef = useRef<{ blockId: string; store: BlockStore; supabase: ReturnType<typeof createClient> } | null>(null);
  if (!storeRef.current || storeRef.current.blockId !== blockId) {
    const supabase = createClient();
    const tables = createTables(supabase);
    const store = new BlockStore(blockId, tables);
    store.load();
    storeRef.current = { blockId, store, supabase };
  }
  const store = storeRef.current.store;
  const supabaseRef = storeRef.current.supabase;

  const snapshot = useSyncExternalStore(
    useCallback((cb: () => void) => store.subscribe(cb), [store]),
    useCallback(() => store.getSnapshot(), [store]),
  );

  useEffect(() => {
    if (!enableRealtime || snapshot.loading) return;

    let cancelled = false;
    let cleanupFn: (() => void) | undefined;

    (async () => {
      const { data: { session } } = await supabaseRef.auth.getSession();
      if (cancelled) return;

      if (!session?.access_token) return;

      // Build a realtime-only client whose WebSocket URL carries the JWT as
      // ?apikey so the server opens the connection as the authenticated user.
      // The default client uses the anon key there, causing RLS to evaluate
      // as the anon role and filter out all postgres_changes events.
      const rtClient = createRealtimeClient(session.access_token);
      cleanupFn = store.startRealtime(rtClient);
      if (cancelled) cleanupFn();
    })();

    return () => {
      cancelled = true;
      cleanupFn?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableRealtime, snapshot.loading, store, blockId]);

  // UI-only state
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

  const value: BlockCacheContextValue = useMemo(
    () => ({
      loading: snapshot.loading,
      weeks: snapshot.weeks,
      getDays: (weekId: string) => store.getDays(weekId),
      getColumns: (dayId: string) => store.getColumns(dayId),
      getRows: (dayId: string) => store.getRows(dayId),
      addWeek: (insert: WeekInsert) => store.addWeek(insert),
      deleteWeek: (weekId: string) => store.deleteWeek(weekId),
      duplicateWeek: (sourceWeek: Week) => store.duplicateWeek(sourceWeek),
      importWeek: (weekData: ImportWeekData) => store.importWeek(weekData),
      importDay: (weekId: string, dayData: ImportDayData) => store.importDay(weekId, dayData),
      deleteDay: (dayId: string) => store.deleteDay(dayId),
      updateDay: (dayId: string, update: DayUpdate) => store.updateDay(dayId, update),
      cacheInsertDay: (weekId: string, day: Day, columns: DayColumn[]) => store.cacheInsertDay(weekId, day, columns),
      addColumn: (dayId: string, insert: DayColumnInsert) => store.addColumn(dayId, insert),
      deleteColumn: (dayId: string, colId: string) => store.deleteColumn(dayId, colId),
      reorderColumns: (dayId: string, reordered: DayColumn[], onError?: () => void) => store.reorderColumns(dayId, reordered, onError),
      addRow: (dayId: string, insert: DayRowInsert) => store.addRow(dayId, insert),
      deleteRow: (dayId: string, rowId: string) => store.deleteRow(dayId, rowId),
      updateRowCells: (dayId: string, rowId: string, cells: Record<string, string>) => store.updateRowCells(dayId, rowId, cells),
      bulkUpdateRowCells: (dayId: string, updates: { rowId: string; cells: Record<string, string> }[]) => store.bulkUpdateRowCells(dayId, updates),
      reorderRows: (dayId: string, reordered: DayRow[], onError?: () => void) => store.reorderRows(dayId, reordered, onError),
      expandedDays,
      toggleDay,
    }),
    [snapshot, store, expandedDays, toggleDay],
  );

  return (
    <BlockCacheContext.Provider value={value}>
      {children}
    </BlockCacheContext.Provider>
  );
}
