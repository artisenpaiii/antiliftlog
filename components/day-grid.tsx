"use client";

import { useState, useMemo, useCallback, useEffect, useContext } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SortableColumnHeader } from "@/components/sortable-column-header";
import { SortableRow } from "@/components/sortable-row";
import { PredictionContext } from "@/lib/contexts/prediction-context";
import { useGridSelection } from "@/hooks/use-grid-selection";
import { cellKey } from "@/lib/engines/selection-engine";
import { cn } from "@/lib/utils";
import { MobileCellPanel } from "@/components/mobile-cell-panel";
import type { DayColumn, DayRow } from "@/lib/types/database";

function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");

    const update = () => {
      setIsTouch(mq.matches || navigator.maxTouchPoints > 0);
    };

    update();

    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isTouch;
}

interface DayGridProps {
  dayId: string;
  columns: DayColumn[];
  rows: DayRow[];
  onColumnsReordered?: (columns: DayColumn[]) => void;
  onRowsReordered?: (rows: DayRow[]) => void;
  onRowDeleted?: (rowId: string) => void;
  onColumnDeleted?: (colId: string) => void;
  bulkSaveFn?: (updates: { rowId: string; cells: Record<string, string> }[]) => Promise<boolean>;
  onSeparatorSaved?: (rowId: string, cells: Record<string, string>) => void;
  onPasteRows?: (rowsCells: Record<string, string>[]) => void;
}

function buildLocalCells(rows: DayRow[]): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();
  for (const row of rows) {
    map.set(row.id, { ...row.cells });
  }
  return map;
}

export function DayGrid({
  dayId,
  columns,
  rows,
  onColumnsReordered,
  onRowsReordered,
  onRowDeleted,
  onColumnDeleted,
  bulkSaveFn,
  onSeparatorSaved,
  onPasteRows,
}: DayGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor),
  );
  const prediction = useContext(PredictionContext);
  const isTouchDevice = useIsTouchDevice();

  const columnIds = useMemo(() => new Set(columns.map((c) => c.id)), [columns]);

  const [localCells, setLocalCells] = useState(() => buildLocalCells(rows));

  useEffect(() => {
    setLocalCells((prev) => {
      const next = new Map<string, Record<string, string>>();
      for (const row of rows) {
        const local = prev.get(row.id);
        // Keep local version if it exists (preserves in-progress edits)
        next.set(row.id, local ?? { ...row.cells });
      }
      return next;
    });
  }, [rows]);

  const handleCellChange = useCallback((rowId: string, colId: string, value: string) => {
    setLocalCells((prev) => {
      const next = new Map(prev);
      const rowCells = { ...(prev.get(rowId) ?? {}) };
      if (value === "") {
        delete rowCells[colId];
      } else {
        rowCells[colId] = value;
      }
      next.set(rowId, rowCells);
      return next;
    });
  }, []);

  const defaultBulkSave = useCallback(async () => false, []);

  const {
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
  } = useGridSelection({
    rows,
    columns,
    localCells,
    onCellChange: handleCellChange,
    bulkSaveFn: bulkSaveFn ?? defaultBulkSave,
    onPasteRows,
  });

  const [editingSeparator, setEditingSeparator] = useState<string | null>(null);
  const [editingSeparatorLabel, setEditingSeparatorLabel] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<
    { type: "row"; id: string } | { type: "column"; id: string; label: string } | { type: "clear"; id: string; label: string } | null
  >(null);

  function confirmDelete() {
    if (!deleteTarget) return;

    if (deleteTarget.type === "row") {
      onRowDeleted?.(deleteTarget.id);
    } else if (deleteTarget.type === "column") {
      onColumnDeleted?.(deleteTarget.id);
    } else {
      const colId = deleteTarget.id;
      // Compute mutations from current state, then apply
      const mutations: { rowId: string; cells: Record<string, string> }[] = [];
      for (const [rowId, cells] of localCells) {
        if (colId in cells) {
          const updated = { ...cells };
          delete updated[colId];
          mutations.push({ rowId, cells: updated });
        }
      }
      if (mutations.length > 0) {
        setLocalCells((prev) => {
          const next = new Map(prev);
          for (const m of mutations) {
            next.set(m.rowId, m.cells);
          }
          return next;
        });
        bulkSaveFn?.(mutations);
      }
    }

    setDeleteTarget(null);
  }

  if (rows.length === 0) {
    return <p className="px-4 py-3 text-sm text-muted-foreground">No rows yet. Add a row to start entering data.</p>;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;

    if (columnIds.has(activeId)) {
      const oldIndex = columns.findIndex((c) => c.id === active.id);
      const newIndex = columns.findIndex((c) => c.id === over.id);
      const reordered = arrayMove(columns, oldIndex, newIndex);

      onColumnsReordered?.(reordered);
    } else {
      const oldIndex = rows.findIndex((r) => r.id === active.id);
      const newIndex = rows.findIndex((r) => r.id === over.id);
      const reordered = arrayMove(rows, oldIndex, newIndex);

      onRowsReordered?.(reordered);
    }
  }

  const handleGridBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;

    const next = e.relatedTarget as Node | null;

    if (!next || !e.currentTarget.contains(next)) {
      if (editingCell) {
        commitEdit();
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div
        ref={containerRef}
        tabIndex={0}
        className="overflow-auto outline-none"
        onKeyDown={handleGridKeyDown}
        onCopy={handleGridCopy}
        onPaste={handleGridPaste}
        onBlur={handleGridBlur}
      >
        <table className="text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              <th className="w-8 bg-card" />
              <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
                {columns.map((col) => (
                  <SortableColumnHeader
                    key={col.id}
                    id={col.id}
                    label={col.label}
                    onClear={() => setDeleteTarget({ type: "clear", id: col.id, label: col.label })}
                    onDelete={() => setDeleteTarget({ type: "column", id: col.id, label: col.label })}
                  />
                ))}
              </SortableContext>
              <th className="w-8 bg-card" />
            </tr>
          </thead>
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {rows.map((row) => {
                const isSeparator = "__separator_label" in (row.cells ?? {});

                if (isSeparator) {
                  const label = row.cells.__separator_label ?? "";
                  return (
                    <SortableRow key={row.id} id={row.id}>
                      <td colSpan={columns.length} className="px-2 py-2" onMouseDown={() => clearSelection()}>
                        {editingSeparator === row.id ? (
                          <input
                            className="w-full border-b border-primary bg-transparent text-xs font-semibold uppercase tracking-wider text-muted-foreground outline-none"
                            value={editingSeparatorLabel}
                            onChange={(e) => setEditingSeparatorLabel(e.target.value)}
                            onBlur={() => {
                              const trimmed = editingSeparatorLabel.trim();
                              if (trimmed && trimmed !== label) {
                                onSeparatorSaved?.(row.id, { __separator_label: trimmed });
                              }
                              setEditingSeparator(null);
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") setEditingSeparator(null);
                            }}
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSeparator(row.id);
                                setEditingSeparatorLabel(label);
                              }}
                              className="text-muted-foreground/50 opacity-0 transition-opacity hover:text-muted-foreground group-hover:opacity-100"
                            >
                              <Pencil size={10} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="w-8 px-1 py-1.5">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ type: "row", id: row.id })}
                          className="text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        >
                          <X size={12} />
                        </button>
                      </td>
                    </SortableRow>
                  );
                }

                return (
                  <SortableRow key={row.id} id={row.id}>
                    {columns.map((col) => {
                      const currentCells = localCells.get(row.id) ?? {};
                      const cellValue = currentCells[col.id] ?? "";
                      const isWeightCol = prediction !== null && prediction.weightLabel !== null && col.label === prediction.weightLabel;
                      const placeholder = isWeightCol && !cellValue ? (prediction!.predictWeight(currentCells, columns, dayId) ?? undefined) : undefined;

                      const cellIsEditing = editingCell?.rowId === row.id && editingCell?.colId === col.id;
                      const cellIsSelected = isSelected(row.id, col.id);
                      const cellIsFocused = isFocused(row.id, col.id);
                      const saveState = cellSaveStates.get(cellKey(row.id, col.id));

                      return (
                        <td
                          key={col.id}
                          className={cn(
                            "cursor-cell border border-border/40 px-2 py-1.5 transition-shadow",
                            cellIsSelected && "bg-primary/10",
                            cellIsFocused && "ring-2 ring-inset ring-primary",
                            saveState === "saved" && "shadow-[inset_0_0_0_2px_theme(colors.emerald.500)]",
                            saveState === "error" && "shadow-[inset_0_0_0_2px_theme(colors.red.500)]",
                            saveState === "saving" && "shadow-[inset_0_0_0_1px_theme(colors.primary)]",
                          )}
                          onPointerDown={(e) => {
                            if ((e.target as HTMLElement).closest("button")) return;

                            if (e.pointerType === "touch") {
                              selectCell({ rowId: row.id, colId: col.id }, { shift: false, ctrl: false });
                              startEditing({ rowId: row.id, colId: col.id });
                            } else {
                              selectCell({ rowId: row.id, colId: col.id }, { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey });
                            }
                          }}
                          onDoubleClick={() => {
                            if (!isTouchDevice) {
                              startEditing({ rowId: row.id, colId: col.id });
                            }
                          }}
                        >
                          {cellIsEditing && !isTouchDevice ? (
                            <input
                              ref={editInputRef}
                              value={editValue}
                              onChange={(e) => handleEditInputChange(e.target.value)}
                              className="h-8 w-full min-w-[8rem] bg-transparent text-sm outline-none"
                              autoFocus
                            />
                          ) : (
                            <span className={cn("block h-8 min-w-[8rem] truncate text-sm leading-8", !cellValue && placeholder && "text-muted-foreground/50")}>
                              {cellValue || placeholder || "\u00A0"}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="w-8 px-1 py-1.5">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ type: "row", id: row.id })}
                        className="text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    </td>
                  </SortableRow>
                );
              })}
            </tbody>
          </SortableContext>
        </table>
      </div>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteTarget?.type === "clear" ? "Clear Column" : `Delete ${deleteTarget?.type === "column" ? "Column" : "Row"}`}</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === "clear" ? (
                <>
                  Clear all values from the <span className="font-medium text-foreground">{deleteTarget.label}</span> column? The column itself will remain.
                </>
              ) : deleteTarget?.type === "column" ? (
                <>
                  Are you sure you want to delete the <span className="font-medium text-foreground">{deleteTarget.label}</span> column? This will remove the
                  column and its data from all rows.
                </>
              ) : (
                "Are you sure you want to delete this row? This action cannot be undone."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {deleteTarget?.type === "clear" ? "Clear" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isTouchDevice && editingCell && (
        <MobileCellPanel value={editValue} onChange={handleEditInputChange} onCommit={() => stopEditing(true)} onDismiss={() => stopEditing(false)} />
      )}
    </DndContext>
  );
}
