"use client";

import { useState, useCallback, useRef, useMemo, useEffect, useSyncExternalStore } from "react";
import { SelectionEngine, cellKey } from "@/lib/engines/selection-engine";
import { ClipboardEngine } from "@/lib/engines/clipboard-engine";
import { CellMutationBatcher, type CellSaveState, type CellMutation } from "@/lib/engines/cell-mutation-batcher";
import type { CellAddress } from "@/lib/engines/selection-engine";
import type { DayColumn, DayRow } from "@/lib/types/database";

export type { CellAddress } from "@/lib/engines/selection-engine";
export type { CellSaveState } from "@/lib/engines/cell-mutation-batcher";

interface UseGridSelectionOptions {
  rows: DayRow[];
  columns: DayColumn[];
  localCells: Map<string, Record<string, string>>;
  onCellChange: (rowId: string, colId: string, value: string) => void;
  bulkSaveFn: (updates: { rowId: string; cells: Record<string, string> }[]) => Promise<boolean>;
  onPasteRows?: (rowsCells: Record<string, string>[]) => void;
}

function isSeparator(row: DayRow): boolean {
  return "__separator_label" in (row.cells ?? {});
}

export function useGridSelection({
  rows,
  columns,
  localCells,
  onCellChange,
  bulkSaveFn,
  onPasteRows,
}: UseGridSelectionOptions) {
  // --- Engine instances (stable refs) ---
  const selectionEngine = useRef<SelectionEngine | null>(null);
  if (!selectionEngine.current) {
    selectionEngine.current = new SelectionEngine();
  }

  const clipboardEngine = useRef<ClipboardEngine | null>(null);
  if (!clipboardEngine.current) {
    clipboardEngine.current = new ClipboardEngine();
  }

  // --- Per-cell save states ---
  const [cellSaveStates, setCellSaveStates] = useState<Map<string, CellSaveState>>(new Map());

  // Refs for latest values
  const localCellsRef = useRef(localCells);
  localCellsRef.current = localCells;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const bulkSaveFnRef = useRef(bulkSaveFn);
  bulkSaveFnRef.current = bulkSaveFn;

  const batcher = useRef<CellMutationBatcher | null>(null);
  if (!batcher.current) {
    batcher.current = new CellMutationBatcher({
      bulkSaveFn: (updates) => bulkSaveFnRef.current(updates),
      getCurrentCells: (rowId) => localCellsRef.current.get(rowId) ?? {},
      onStateChange: (states) => setCellSaveStates(states),
      debounceMs: 300,
    });
  }

  useEffect(() => {
    return () => {
      batcher.current?.destroy();
    };
  }, []);

  // --- Sync topology ---
  const dataRows = useMemo(() => rows.filter((r) => !isSeparator(r)), [rows]);

  useEffect(() => {
    selectionEngine.current!.setTopology(
      dataRows.map((r) => r.id),
      columns.map((c) => c.id),
    );
  }, [dataRows, columns]);

  // --- Subscribe to selection engine ---
  const selectionSnapshot = useSyncExternalStore(
    (cb) => selectionEngine.current!.subscribe(cb),
    () => selectionEngine.current!.getSnapshot(),
  );

  // Expose selection helpers
  const isSelected = useCallback(
    (rowId: string, colId: string) => selectionSnapshot.selectedKeys.has(cellKey(rowId, colId)),
    [selectionSnapshot.selectedKeys],
  );

  const isFocused = useCallback(
    (rowId: string, colId: string) => {
      const fc = selectionSnapshot.focusedCell;
      if (!fc) return false;
      return fc.rowId === rowId && fc.colId === colId;
    },
    [selectionSnapshot.focusedCell],
  );

  // --- Editing state ---
  const [editingCell, setEditingCell] = useState<CellAddress | null>(null);
  const [editValue, setEditValue] = useState("");
  const preEditValue = useRef("");
  const containerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const focusContainer = useCallback(() => {
    requestAnimationFrame(() => {
      containerRef.current?.focus();
    });
  }, []);

  // --- Commit: apply edit value to ALL selected cells ---
  const commitEdit = useCallback(() => {
    if (!editingCell) return;

    const selectedKeys = selectionEngine.current!.getSelectedKeys();
    const currentVal = localCellsRef.current.get(editingCell.rowId)?.[editingCell.colId] ?? "";
    const changed = currentVal !== preEditValue.current;

    if (changed && selectedKeys.size > 1) {
      // Multi-cell edit: apply value to all selected cells
      const mutations: CellMutation[] = [];
      for (const key of selectedKeys) {
        const idx = key.indexOf(":");
        const rowId = key.slice(0, idx);
        const colId = key.slice(idx + 1);
        onCellChange(rowId, colId, currentVal);
        mutations.push({ rowId, colId, newVal: currentVal });
      }
      batcher.current!.queue(mutations);
      // Flush immediately on commit
      batcher.current!.flush();
    } else if (changed) {
      // Single cell edit
      batcher.current!.queue([{ rowId: editingCell.rowId, colId: editingCell.colId, newVal: currentVal }]);
      batcher.current!.flush();
    }

    setEditingCell(null);
  }, [editingCell, onCellChange]);

  const revertEdit = useCallback(() => {
    if (!editingCell) return;
    onCellChange(editingCell.rowId, editingCell.colId, preEditValue.current);
    setEditingCell(null);
  }, [editingCell, onCellChange]);

  const startEditing = useCallback(
    (addr?: CellAddress, initialValue?: string) => {
      const target = addr ?? selectionSnapshot.focusedCell;
      if (!target) return;

      const row = rowsRef.current.find((r) => r.id === target.rowId);
      if (!row || isSeparator(row)) return;

      const currentVal = localCellsRef.current.get(target.rowId)?.[target.colId] ?? "";
      preEditValue.current = currentVal;

      if (initialValue !== undefined) {
        onCellChange(target.rowId, target.colId, initialValue);
        setEditValue(initialValue);
      } else {
        setEditValue(currentVal);
      }

      setEditingCell(target);
      // Also ensure this cell is selected
      selectionEngine.current!.select(target);
    },
    [selectionSnapshot.focusedCell, onCellChange],
  );

  const stopEditing = useCallback(
    (commit: boolean) => {
      if (commit) {
        commitEdit();
      } else {
        revertEdit();
      }
      focusContainer();
    },
    [commitEdit, revertEdit, focusContainer],
  );

  const selectCell = useCallback(
    (addr: CellAddress, opts: { shift?: boolean; ctrl?: boolean }) => {
      if (editingCell && (editingCell.rowId !== addr.rowId || editingCell.colId !== addr.colId)) {
        commitEdit();
        setEditingCell(null);
      }
      selectionEngine.current!.select(addr, opts);
    },
    [editingCell, commitEdit],
  );

  const clearSelection = useCallback(() => {
    if (editingCell) {
      commitEdit();
      setEditingCell(null);
    }
    selectionEngine.current!.clear();
    focusContainer();
  }, [editingCell, commitEdit, focusContainer]);

  // --- Clear selected cells (Delete/Backspace) ---
  const clearSelectedCells = useCallback(() => {
    const keys = selectionEngine.current!.getSelectedKeys();
    if (keys.size === 0) return;

    const mutations: CellMutation[] = [];
    for (const key of keys) {
      const idx = key.indexOf(":");
      const rowId = key.slice(0, idx);
      const colId = key.slice(idx + 1);
      onCellChange(rowId, colId, "");
      mutations.push({ rowId, colId, newVal: "" });
    }
    batcher.current!.queue(mutations);
    batcher.current!.flush();
  }, [onCellChange]);

  // --- Keyboard handler ---
  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (editingCell) {
        switch (e.key) {
          case "Escape":
            e.preventDefault();
            stopEditing(false);
            return;
          case "Enter":
            e.preventDefault();
            stopEditing(true);
            selectionEngine.current!.navigate(e.shiftKey ? "up" : "down", false);
            return;
          case "Tab":
            e.preventDefault();
            stopEditing(true);
            selectionEngine.current!.navigate(e.shiftKey ? "left" : "right", false);
            return;
          default:
            return;
        }
      }

      if (!selectionSnapshot.focusedCell) return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          selectionEngine.current!.navigate("up", e.shiftKey);
          return;
        case "ArrowDown":
          e.preventDefault();
          selectionEngine.current!.navigate("down", e.shiftKey);
          return;
        case "ArrowLeft":
          e.preventDefault();
          selectionEngine.current!.navigate("left", e.shiftKey);
          return;
        case "ArrowRight":
          e.preventDefault();
          selectionEngine.current!.navigate("right", e.shiftKey);
          return;
        case "Tab":
          e.preventDefault();
          selectionEngine.current!.navigate(e.shiftKey ? "left" : "right", false);
          return;
        case "Enter":
          e.preventDefault();
          startEditing();
          return;
        case "F2":
          e.preventDefault();
          startEditing();
          return;
        case "Escape":
          e.preventDefault();
          clearSelection();
          return;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          clearSelectedCells();
          return;
        default: {
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            startEditing(undefined, e.key);
          }
          return;
        }
      }
    },
    [editingCell, selectionSnapshot.focusedCell, startEditing, stopEditing, clearSelection, clearSelectedCells],
  );

  // --- Copy handler ---
  const handleGridCopy = useCallback(
    (e: React.ClipboardEvent) => {
      if (editingCell) return;
      const keys = selectionEngine.current!.getSelectedKeys();
      if (keys.size === 0) return;

      e.preventDefault();

      const topology = selectionEngine.current!.getTopology();
      const getCellValue = (rowId: string, colId: string) =>
        localCellsRef.current.get(rowId)?.[colId] ?? "";

      // Save to internal buffer
      clipboardEngine.current!.copy(keys, getCellValue, topology);

      // Also set OS clipboard as TSV
      const tsv = clipboardEngine.current!.handleNativeCopy(keys, getCellValue, topology);
      e.clipboardData.setData("text/plain", tsv);
    },
    [editingCell],
  );

  // --- Paste handler ---
  const handleGridPaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (editingCell) return;
      const keys = selectionEngine.current!.getSelectedKeys();
      if (keys.size === 0) return;

      e.preventDefault();

      const text = e.clipboardData.getData("text/plain");
      if (!text) return;

      const topology = selectionEngine.current!.getTopology();
      const mutations = clipboardEngine.current!.handleNativePaste(text, keys, topology);

      // Apply mutations to local state
      for (const m of mutations) {
        onCellChange(m.rowId, m.colId, m.newVal);
      }

      // Queue for batch save
      if (mutations.length > 0) {
        batcher.current!.queue(mutations);
        batcher.current!.flush();
      }
    },
    [editingCell, onCellChange],
  );

  // --- Edit input change ---
  const handleEditInputChange = useCallback(
    (value: string) => {
      if (!editingCell) return;
      setEditValue(value);
      onCellChange(editingCell.rowId, editingCell.colId, value);
    },
    [editingCell, onCellChange],
  );

  return {
    editingCell,
    editValue,
    editInputRef,
    containerRef,
    isSelected,
    isFocused,
    selectCell,
    startEditing,
    stopEditing,
    clearSelection,
    handleGridKeyDown,
    handleGridCopy,
    handleGridPaste,
    handleEditInputChange,
    commitEdit,
    cellSaveStates,
  };
}
