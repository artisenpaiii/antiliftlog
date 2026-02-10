"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, X, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Day, DayColumn } from "@/lib/types/database";
import { WEEKDAY_LABELS } from "@/lib/types/database";

interface CreateDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekId: string;
  nextDayNumber: number;
  suggestedColumns: string[];
  onDayCreated: (day: Day, columns: DayColumn[]) => void;
}

export function CreateDayDialog({
  open,
  onOpenChange,
  weekId,
  nextDayNumber,
  suggestedColumns,
  onDayCreated,
}: CreateDayDialogProps) {
  const [dayName, setDayName] = useState("");
  const [weekDayIndex, setWeekDayIndex] = useState("__none__");
  const [columns, setColumns] = useState<string[]>(suggestedColumns);
  const [newColumn, setNewColumn] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setDayName("");
      setWeekDayIndex("__none__");
      setColumns(suggestedColumns);
      setNewColumn("");
      setError(null);
    }
  }

  function addColumn() {
    const trimmed = newColumn.trim();
    if (!trimmed) return;
    setColumns((prev) => [...prev, trimmed]);
    setNewColumn("");
  }

  function removeColumn(index: number) {
    setColumns((prev) => prev.filter((_, i) => i !== index));
  }

  function moveColumn(index: number, direction: "up" | "down") {
    setColumns((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function handleColumnKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addColumn();
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (columns.length === 0) {
      setError("Add at least one column.");
      return;
    }

    setIsCreating(true);
    setError(null);

    const supabase = createClient();
    const tables = createTables(supabase);

    const { data: day, error: dayError } = await tables.days.create({
      week_id: weekId,
      day_number: nextDayNumber,
      name: dayName.trim() || null,
      week_day_index: weekDayIndex === "__none__" ? null : parseInt(weekDayIndex, 10),
    });

    if (dayError || !day) {
      setError(dayError ?? "Failed to create day");
      setIsCreating(false);
      return;
    }

    const columnInserts = columns.map((label, index) => ({
      day_id: day.id,
      label,
      order: index,
    }));

    const { data: createdColumns, error: colError } =
      await tables.dayColumns.createMany(columnInserts);

    if (colError || !createdColumns) {
      setError(colError ?? "Day created but failed to create columns");
      setIsCreating(false);
      return;
    }

    setIsCreating(false);
    handleOpenChange(false);
    onDayCreated(day, createdColumns);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Add Day</DialogTitle>
            <DialogDescription>
              Define the day name and columns for your training day.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="day-name">Day name (optional)</Label>
              <Input
                id="day-name"
                value={dayName}
                onChange={(e) => setDayName(e.target.value)}
                placeholder={`e.g. Upper Body`}
                className="mt-2"
                autoFocus
              />
            </div>

            <div>
              <Label>Weekday (optional)</Label>
              <Select value={weekDayIndex} onValueChange={setWeekDayIndex}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {Object.entries(WEEKDAY_LABELS).map(([idx, label]) => (
                    <SelectItem key={idx} value={idx}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Columns</Label>
              {columns.length > 0 && (
                <div className="mt-2 space-y-1">
                  {columns.map((col, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm"
                    >
                      <span className="flex-1">{col}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0}
                        onClick={() => moveColumn(index, "up")}
                      >
                        <ChevronUp size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === columns.length - 1}
                        onClick={() => moveColumn(index, "down")}
                      >
                        <ChevronDown size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeColumn(index)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 flex gap-2">
                <Input
                  value={newColumn}
                  onChange={(e) => setNewColumn(e.target.value)}
                  onKeyDown={handleColumnKeyDown}
                  placeholder="e.g. Exercise, Sets, Reps"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addColumn}
                  disabled={!newColumn.trim()}
                >
                  <Plus size={14} />
                  Add
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || columns.length === 0}
            >
              {isCreating ? "Creating..." : "Create Day"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
