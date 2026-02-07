"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import { CellInput } from "@/components/auto-save-input";
import { SortableColumnHeader } from "@/components/sortable-column-header";
import { SortableRow } from "@/components/sortable-row";
import type { DayColumn, DayRow } from "@/lib/types/database";

interface DayGridProps {
  columns: DayColumn[];
  rows: DayRow[];
  onColumnsReordered?: (columns: DayColumn[]) => void;
  onRowsReordered?: (rows: DayRow[]) => void;
}

function buildLocalCells(rows: DayRow[]): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();
  for (const row of rows) {
    map.set(row.id, { ...row.cells });
  }
  return map;
}

export function DayGrid({ columns, rows, onColumnsReordered, onRowsReordered }: DayGridProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));

  const columnIds = useMemo(() => new Set(columns.map((c) => c.id)), [columns]);

  const [localCells, setLocalCells] = useState(() => buildLocalCells(rows));

  useEffect(() => {
    setLocalCells(buildLocalCells(rows));
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

  const handleCellBlur = useCallback((rowId: string) => {
    const current = localCells.get(rowId) ?? {};
    const original = rows.find((r) => r.id === rowId)?.cells ?? {};

    if (JSON.stringify(current) === JSON.stringify(original)) return;

    const supabase = createClient();
    const tables = createTables(supabase);
    tables.dayRows.updateCells(rowId, current).then(({ error }) => {
      if (error) {
        console.error("Failed to save cells:", error);
      }
    });
  }, [localCells, rows]);

  if (rows.length === 0) {
    return <p className="px-4 py-3 text-sm text-muted-foreground">No rows yet. Add a row to start entering data.</p>;
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;

    if (columnIds.has(activeId)) {
      const oldIndex = columns.findIndex((c) => c.id === active.id);
      const newIndex = columns.findIndex((c) => c.id === over.id);
      const reordered = arrayMove(columns, oldIndex, newIndex);

      onColumnsReordered?.(reordered);

      const supabase = createClient();
      const tables = createTables(supabase);

      const updates = reordered
        .map((col, i) => ({ id: col.id, order: i }))
        .filter((u) => u.order !== columns.find((c) => c.id === u.id)?.order);

      await Promise.all(updates.map((u) => tables.dayColumns.update(u.id, { order: u.order })));
    } else {
      const oldIndex = rows.findIndex((r) => r.id === active.id);
      const newIndex = rows.findIndex((r) => r.id === over.id);
      const reordered = arrayMove(rows, oldIndex, newIndex);

      onRowsReordered?.(reordered);

      const supabase = createClient();
      const tables = createTables(supabase);

      const updates = reordered
        .map((row, i) => ({ id: row.id, order: i }))
        .filter((u) => u.order !== rows.find((r) => r.id === u.id)?.order);

      await Promise.all(updates.map((u) => tables.dayRows.update(u.id, { order: u.order })));
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <section className="overflow-auto max-h-[70vh]">
        <table className="text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border">
              <th className="w-8 bg-card" />
              <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
                {columns.map((col) => (
                  <SortableColumnHeader key={col.id} id={col.id} label={col.label} />
                ))}
              </SortableContext>
            </tr>
          </thead>
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {rows.map((row) => (
                <SortableRow key={row.id} id={row.id}>
                  {columns.map((col) => (
                    <td key={col.id} className="px-2 py-1.5">
                      <CellInput
                        value={localCells.get(row.id)?.[col.id] ?? ""}
                        onChange={(val) => handleCellChange(row.id, col.id, val)}
                        onBlur={() => handleCellBlur(row.id)}
                      />
                    </td>
                  ))}
                </SortableRow>
              ))}
            </tbody>
          </SortableContext>
        </table>
      </section>
    </DndContext>
  );
}
