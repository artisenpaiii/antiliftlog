"use client";

import { useMemo } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import { AutoSaveInput } from "@/components/auto-save-input";
import { SortableColumnHeader } from "@/components/sortable-column-header";
import { SortableRow } from "@/components/sortable-row";
import type { DayColumn, DayRow, DayCell } from "@/lib/types/database";

interface DayGridProps {
  columns: DayColumn[];
  rows: DayRow[];
  cells: Map<string, DayCell>;
  onColumnsReordered?: (columns: DayColumn[]) => void;
  onRowsReordered?: (rows: DayRow[]) => void;
}

function cellKey(rowId: string, columnId: string): string {
  return `${rowId}:${columnId}`;
}

export { cellKey };

export function DayGrid({ columns, rows, cells, onColumnsReordered, onRowsReordered }: DayGridProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));

  const columnIds = useMemo(() => new Set(columns.map((c) => c.id)), [columns]);

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
      <section className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-8" />
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
                  {columns.map((col) => {
                    const cell = cells.get(cellKey(row.id, col.id));
                    return (
                      <td key={col.id} className="px-2 py-1.5">
                        <AutoSaveInput rowId={row.id} columnId={col.id} initialValue={cell?.value ?? ""} />
                      </td>
                    );
                  })}
                </SortableRow>
              ))}
            </tbody>
          </SortableContext>
        </table>
      </section>
    </DndContext>
  );
}
