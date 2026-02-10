"use client";

import { useState } from "react";
import { Plus, Loader2, Trash2, ChevronRight, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DayGrid } from "@/components/day-grid";
import { useBlockCache } from "@/lib/contexts/block-cache-context";
import type { Day } from "@/lib/types/database";
import { WEEKDAY_SHORT_LABELS } from "@/lib/types/database";

function decimalToTimeStr(decimal: number): string {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal % 1) * 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function timeStrToDecimal(timeStr: string): number | null {
  const trimmed = timeStr.trim();
  if (trimmed === "") return null;
  const [hoursStr, minutesStr] = trimmed.split(":");
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours + minutes / 60;
}

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
    updateDay,
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

  // Day info state
  const [infoOpen, setInfoOpen] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [sleepTime, setSleepTime] = useState("");
  const [sleepQuality, setSleepQuality] = useState("");

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
      setShowColumnInput(false);
    }
    setAddingColumn(false);
  }

  function handleOpenInfo() {
    setSleepTime(day.sleep_time != null ? decimalToTimeStr(day.sleep_time) : "");
    setSleepQuality(day.sleep_quality != null ? String(day.sleep_quality) : "");
    setInfoError(null);
    setInfoOpen(true);
  }

  async function handleSaveInfo() {
    setSavingInfo(true);
    setInfoError(null);

    const parsedTime = sleepTime.trim() === "" ? null : timeStrToDecimal(sleepTime);
    const parsedQuality = sleepQuality.trim() === "" ? null : parseInt(sleepQuality, 10);

    if (parsedTime != null && (isNaN(parsedTime) || parsedTime < 0 || parsedTime > 24)) {
      setInfoError("Sleep time must be between 0 and 24 hours");
      setSavingInfo(false);
      return;
    }

    if (parsedQuality != null && (isNaN(parsedQuality) || parsedQuality < 0 || parsedQuality > 100)) {
      setInfoError("Sleep quality must be between 0 and 100");
      setSavingInfo(false);
      return;
    }

    const success = await updateDay(day.id, {
      sleep_time: parsedTime,
      sleep_quality: parsedQuality,
    });

    if (!success) {
      setInfoError("Failed to save day info");
      setSavingInfo(false);
      return;
    }

    setSavingInfo(false);
    setInfoOpen(false);
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

  const dayLabel = day.week_day_index !== null && day.week_day_index !== undefined
    ? `${WEEKDAY_SHORT_LABELS[day.week_day_index]} - ${day.name ?? `Day ${day.day_number}`}`
    : day.name ?? `Day ${day.day_number}`;

  return (
    <div className="rounded-lg border border-border">
      <div
        role="button"
        tabIndex={0}
        onClick={() => toggleDay(day.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleDay(day.id);
          }
        }}
        className={cn(
          "flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50 cursor-pointer",
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
        <div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <Select
            value={day.week_day_index !== null && day.week_day_index !== undefined ? String(day.week_day_index) : "__none__"}
            onValueChange={(val) => {
              const idx = val === "__none__" ? null : parseInt(val, 10);
              updateDay(day.id, { week_day_index: idx });
            }}
          >
            <SelectTrigger className="h-7 w-[72px] text-xs px-2 border-none bg-transparent hover:bg-muted">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {Object.entries(WEEKDAY_SHORT_LABELS).map(([idx, label]) => (
                <SelectItem key={idx} value={idx}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "row" : "rows"}
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenInfo();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              handleOpenInfo();
            }
          }}
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted",
            day.sleep_time != null || day.sleep_quality != null
              ? "text-primary"
              : "text-muted-foreground",
          )}
        >
          <Moon size={14} />
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
      </div>

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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowColumnInput(true)}
              className="text-muted-foreground"
            >
              <Plus size={14} />
              Add Column
            </Button>
          </div>
        </>
      )}

      {/* Day Info Dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Day Info</DialogTitle>
            <DialogDescription>
              Track sleep and recovery for{" "}
              <span className="font-medium text-foreground">{dayLabel}</span>.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveInfo();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="sleep-time">Sleep Time</Label>
              <Input
                id="sleep-time"
                type="time"
                value={sleepTime}
                onChange={(e) => setSleepTime(e.target.value)}
                placeholder="HH:MM"
                disabled={savingInfo}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sleep-quality">Sleep Quality (0–100)</Label>
              <Input
                id="sleep-quality"
                type="number"
                step="1"
                min="0"
                max="100"
                value={sleepQuality}
                onChange={(e) => setSleepQuality(e.target.value)}
                placeholder="e.g. 80"
                disabled={savingInfo}
              />
            </div>
            {infoError && (
              <p className="text-destructive text-sm">{infoError}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInfoOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingInfo}>
                {savingInfo ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Column Dialog */}
      <Dialog
        open={showColumnInput}
        onOpenChange={(open) => {
          setShowColumnInput(open);
          if (!open) setNewColumnLabel("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
            <DialogDescription>
              Enter a name for the new column.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddColumn();
            }}
          >
            <Input
              value={newColumnLabel}
              onChange={(e) => setNewColumnLabel(e.target.value)}
              placeholder="Column name"
              className="mb-4"
              disabled={addingColumn}
              autoFocus
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowColumnInput(false);
                  setNewColumnLabel("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addingColumn || !newColumnLabel.trim()}
              >
                {addingColumn ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
