"use client";

import { useState } from "react";
import { Plus, Loader2, Trash2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DayGrid } from "@/components/day-grid";
import { useBlockCache } from "@/lib/contexts/block-cache-context";
import type { Day } from "@/lib/types/database";

interface DayCardProps {
  day: Day;
}

export function DayCard({ day }: DayCardProps) {
  const {
    getColumns,
    getRows,
    addRow,
    addColumn,
    deleteDay,
    deleteColumn,
    deleteRow,
    reorderColumns,
    reorderRows,
    updateRowCells,
    expandedDays,
    toggleDay,
  } = useBlockCache();

  const columns = getColumns(day.id);
  const rows = getRows(day.id);
  const expanded = expandedDays.has(day.id);
  const [addingRow, setAddingRow] = useState(false);
  const [showColumnInput, setShowColumnInput] = useState(false);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState("");

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleAddRow() {
    setAddingRow(true);
    await addRow(day.id, {
      day_id: day.id,
      order: rows.length,
      cells: {},
    });
    setAddingRow(false);
  }

  async function handleAddColumn() {
    const label = newColumnLabel.trim();
    if (!label) return;

    setAddingColumn(true);
    const result = await addColumn(day.id, {
      day_id: day.id,
      label,
      order: columns.length,
    });

    if (result) {
      setNewColumnLabel("");
    }
    setAddingColumn(false);
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);

    const success = await deleteDay(day.id);

    if (!success) {
      setDeleteError("Failed to delete day");
      setIsDeleting(false);
      return;
    }

    setDeleteOpen(false);
    setIsDeleting(false);
  }

  function handleColumnDeleted(colId: string) {
    deleteColumn(day.id, colId);
  }

  function handleRowDeleted(rowId: string) {
    deleteRow(day.id, rowId);
  }

  function handleCellSaved(rowId: string, cells: Record<string, string>) {
    updateRowCells(day.id, rowId, cells);
  }

  const dayLabel = day.name ?? `Day ${day.day_number}`;

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => toggleDay(day.id)}
        className={cn(
          "flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50",
          expanded && "border-b border-border",
        )}
      >
        <ChevronRight
          size={14}
          className={cn(
            "text-muted-foreground transition-transform duration-150",
            expanded && "rotate-90",
          )}
        />
        <h4 className="text-sm font-medium flex-1">{dayLabel}</h4>
        <span className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "row" : "rows"}
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setDeleteOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              setDeleteOpen(true);
            }
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
        >
          <Trash2 size={14} />
        </span>
      </button>

      {expanded && (
        <>
          <DayGrid
            columns={columns}
            rows={rows}
            onColumnsReordered={(reordered) => reorderColumns(day.id, reordered)}
            onRowsReordered={(reordered) => reorderRows(day.id, reordered)}
            onRowDeleted={handleRowDeleted}
            onColumnDeleted={handleColumnDeleted}
            onCellSaved={handleCellSaved}
          />

          <div className="flex items-center gap-2 px-4 py-3">
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
            {showColumnInput ? (
              <form
                className="flex items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddColumn();
                }}
              >
                <Input
                  value={newColumnLabel}
                  onChange={(e) => setNewColumnLabel(e.target.value)}
                  placeholder="Column name"
                  className="h-8 w-32 text-sm"
                  disabled={addingColumn}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setShowColumnInput(false);
                      setNewColumnLabel("");
                    }
                  }}
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  disabled={addingColumn || !newColumnLabel.trim()}
                  className="text-muted-foreground"
                >
                  {addingColumn ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowColumnInput(true)}
                className="text-muted-foreground"
              >
                <Plus size={14} />
                Add Column
              </Button>
            )}
          </div>
        </>
      )}

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
