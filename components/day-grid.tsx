"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CellInput } from "@/components/auto-save-input";
import { SortableColumnHeader } from "@/components/sortable-column-header";
import { SortableRow } from "@/components/sortable-row";
import type { DayColumn, DayRow } from "@/lib/types/database";

interface DayGridProps {
  columns: DayColumn[];
  rows: DayRow[];
  onColumnsReordered?: (columns: DayColumn[]) => void;
  onRowsReordered?: (rows: DayRow[]) => void;
  onRowDeleted?: (rowId: string) => void;
  onColumnDeleted?: (colId: string) => void;
  onCellSaved?: (rowId: string, cells: Record<string, string>) => void;
}

function buildLocalCells(rows: DayRow[]): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();
  for (const row of rows) {
    map.set(row.id, { ...row.cells });
  }
  return map;
}

export function DayGrid({ columns, rows, onColumnsReordered, onRowsReordered, onRowDeleted, onColumnDeleted, onCellSaved }: DayGridProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));

  const columnIds = useMemo(() => new Set(columns.map((c) => c.id)), [columns]);

  const [localCells, setLocalCells] = useState(() => buildLocalCells(rows));
  const [savedRows, setSavedRows] = useState<Set<string>>(new Set());
  const savedTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    setLocalCells(buildLocalCells(rows));
  }, [rows]);

  useEffect(() => {
    const timers = savedTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

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

  const handleCellBlur = useCallback((rowId: string) => {
    const current = localCells.get(rowId) ?? {};
    const original = rows.find((r) => r.id === rowId)?.cells ?? {};

    if (JSON.stringify(current) === JSON.stringify(original)) return;

    onCellSaved?.(rowId, current);

    setSavedRows((prev) => new Set(prev).add(rowId));
    const existing = savedTimers.current.get(rowId);
    if (existing) clearTimeout(existing);
    savedTimers.current.set(
      rowId,
      setTimeout(() => {
        setSavedRows((prev) => {
          const next = new Set(prev);
          next.delete(rowId);
          return next;
        });
        savedTimers.current.delete(rowId);
      }, 1500),
    );
  }, [localCells, rows, onCellSaved]);

  const [deleteTarget, setDeleteTarget] = useState<{ type: "row"; id: string } | { type: "column"; id: string; label: string } | null>(null);

  function confirmDelete() {
    if (!deleteTarget) return;

    if (deleteTarget.type === "row") {
      onRowDeleted?.(deleteTarget.id);
    } else {
      onColumnDeleted?.(deleteTarget.id);
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <section className="overflow-auto">
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
                    onDelete={() => setDeleteTarget({ type: "column", id: col.id, label: col.label })}
                  />
                ))}
              </SortableContext>
              <th className="w-8 bg-card" />
            </tr>
          </thead>
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {rows.map((row) => (
                <SortableRow key={row.id} id={row.id} saved={savedRows.has(row.id)}>
                  {columns.map((col) => (
                    <td key={col.id} className="px-2 py-1.5">
                      <CellInput
                        value={localCells.get(row.id)?.[col.id] ?? ""}
                        onChange={(val) => handleCellChange(row.id, col.id, val)}
                        onBlur={() => handleCellBlur(row.id)}
                      />
                    </td>
                  ))}
                  <td className="w-8 px-1 py-1.5">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: "row", id: row.id })}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </td>
                </SortableRow>
              ))}
            </tbody>
          </SortableContext>
        </table>
      </section>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {deleteTarget?.type === "column" ? "Column" : "Row"}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === "column"
                ? <>Are you sure you want to delete the <span className="font-medium text-foreground">{deleteTarget.label}</span> column? This will remove the column and its data from all rows.</>
                : "Are you sure you want to delete this row? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
