"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DayGrid, cellKey } from "@/components/day-grid";
import type { Day, DayColumn, DayRow, DayCell } from "@/lib/types/database";

interface DayCardProps {
  day: Day;
  initialColumns?: DayColumn[];
  onDeleted?: (dayId: string) => void;
}

export function DayCard({ day, initialColumns, onDeleted }: DayCardProps) {
  const [columns, setColumns] = useState<DayColumn[]>(initialColumns ?? []);
  const [rows, setRows] = useState<DayRow[]>([]);
  const [cells, setCells] = useState<Map<string, DayCell>>(new Map());
  const [loading, setLoading] = useState(!initialColumns);
  const [addingRow, setAddingRow] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const tables = createTables(supabase);

    const [colResult, rowResult] = await Promise.all([
      initialColumns
        ? Promise.resolve({ data: initialColumns, error: null })
        : tables.dayColumns.findByDayId(day.id),
      tables.dayRows.findByDayId(day.id),
    ]);

    if (colResult.error) {
      console.error("Failed to load columns:", colResult.error);
    }
    if (rowResult.error) {
      console.error("Failed to load rows:", rowResult.error);
    }

    const cols = colResult.data ?? [];
    const rws = rowResult.data ?? [];
    setColumns(cols);
    setRows(rws);

    if (rws.length > 0) {
      const rowIds = rws.map((r) => r.id);
      const cellResult = await tables.dayCells.findByRowIds(rowIds);
      if (cellResult.error) {
        console.error("Failed to load cells:", cellResult.error);
      }
      const cellMap = new Map<string, DayCell>();
      for (const cell of cellResult.data ?? []) {
        cellMap.set(cellKey(cell.day_row_id, cell.day_column_id), cell);
      }
      setCells(cellMap);
    }

    setLoading(false);
  }, [day.id, initialColumns]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddRow() {
    setAddingRow(true);
    const supabase = createClient();
    const tables = createTables(supabase);
    const { data, error } = await tables.dayRows.create({
      day_id: day.id,
      order: rows.length,
    });

    if (error || !data) {
      console.error("Failed to add row:", error);
      setAddingRow(false);
      return;
    }

    setRows((prev) => [...prev, data]);
    setAddingRow(false);
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);

    const supabase = createClient();
    const tables = createTables(supabase);
    const { error } = await tables.days.delete(day.id);

    if (error) {
      setDeleteError(error);
      setIsDeleting(false);
      return;
    }

    setDeleteOpen(false);
    setIsDeleting(false);
    onDeleted?.(day.id);
  }

  function handleColumnsReordered(reordered: DayColumn[]) {
    setColumns(reordered);
  }

  function handleRowsReordered(reordered: DayRow[]) {
    setRows(reordered);
  }

  const dayLabel = day.name ?? `Day ${day.day_number}`;

  if (loading) {
    return (
      <div className="rounded-lg border border-border">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h4 className="text-sm font-medium">{dayLabel}</h4>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <h4 className="text-sm font-medium flex-1">{dayLabel}</h4>
        <span className="text-xs text-muted-foreground">
          {columns.length} {columns.length === 1 ? "column" : "columns"}
        </span>
        {onDeleted && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>

      <DayGrid
        columns={columns}
        rows={rows}
        cells={cells}
        onColumnsReordered={handleColumnsReordered}
        onRowsReordered={handleRowsReordered}
      />

      <div className="px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddRow}
          disabled={addingRow}
          className="text-muted-foreground"
        >
          {addingRow ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} />
          )}
          Add Row
        </Button>
      </div>

      {/* Delete Day Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Day</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">{dayLabel}</span>?
              This will remove all rows and data within this day. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-destructive text-sm">{deleteError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
