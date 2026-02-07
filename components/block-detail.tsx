"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Calendar,
  Plus,
  Loader2,
  MoreHorizontal,
  Copy,
  Trash2,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { WeekContent } from "@/components/week-content";
import type {
  Block,
  Week,
  Day,
  DayColumn,
  DayRow,
} from "@/lib/types/database";

function remapCellKeys(
  cells: Record<string, string>,
  columnIdMap: Map<string, string>,
): Record<string, string> {
  const remapped: Record<string, string> = {};
  for (const [oldColId, value] of Object.entries(cells)) {
    const newColId = columnIdMap.get(oldColId);
    if (newColId) remapped[newColId] = value;
  }
  return remapped;
}

interface BlockDetailProps {
  block: Block;
  onBack?: () => void;
}

export function BlockDetail({ block, onBack }: BlockDetailProps) {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>("");
  const [creatingWeek, setCreatingWeek] = useState(false);

  // Delete week state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Week | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Duplicate week state
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const loadWeeks = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const tables = createTables(supabase);
    const { data, error } = await tables.weeks.findByBlockId(block.id);

    if (error) {
      console.error("Failed to load weeks:", error);
    }

    const loaded = data ?? [];
    setWeeks(loaded);
    if (loaded.length > 0 && !selectedTab) {
      setSelectedTab(loaded[0].id);
    }
    setLoading(false);
  }, [block.id, selectedTab]);

  useEffect(() => {
    setSelectedTab("");
    loadWeeks();
  }, [block.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreateWeek() {
    setCreatingWeek(true);
    const supabase = createClient();
    const tables = createTables(supabase);
    const { data, error } = await tables.weeks.create({
      block_id: block.id,
      week_number: weeks.length + 1,
    });

    if (error || !data) {
      console.error("Failed to create week:", error);
      setCreatingWeek(false);
      return;
    }

    setWeeks((prev) => [...prev, data]);
    setSelectedTab(data.id);
    setCreatingWeek(false);
  }

  function openDeleteWeek(week: Week) {
    setDeleteTarget(week);
    setDeleteError(null);
    setDeleteOpen(true);
  }

  async function handleDeleteWeek() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    const supabase = createClient();
    const tables = createTables(supabase);
    const { error } = await tables.weeks.delete(deleteTarget.id);

    if (error) {
      setDeleteError(error);
      setIsDeleting(false);
      return;
    }

    setWeeks((prev) => {
      const filtered = prev.filter((w) => w.id !== deleteTarget.id);
      if (selectedTab === deleteTarget.id) {
        const idx = prev.findIndex((w) => w.id === deleteTarget.id);
        const next =
          filtered[Math.min(idx, filtered.length - 1)] ?? null;
        setSelectedTab(next?.id ?? "");
      }
      return filtered;
    });
    setDeleteOpen(false);
    setIsDeleting(false);
  }

  async function handleDuplicateWeek(sourceWeek: Week) {
    setDuplicating(sourceWeek.id);

    const supabase = createClient();
    const tables = createTables(supabase);

    // Fetch all days for the source week
    const { data: sourceDays } = await tables.days.findByWeekId(sourceWeek.id);
    if (!sourceDays || sourceDays.length === 0) {
      // Just create an empty week
      const { data: newWeek } = await tables.weeks.create({
        block_id: block.id,
        week_number: weeks.length + 1,
      });
      if (newWeek) {
        setWeeks((prev) => [...prev, newWeek]);
        setSelectedTab(newWeek.id);
      }
      setDuplicating(null);
      return;
    }

    // Fetch columns and rows for each day
    const dayData: {
      day: Day;
      columns: DayColumn[];
      rows: DayRow[];
    }[] = [];

    for (const day of sourceDays) {
      const [colResult, rowResult] = await Promise.all([
        tables.dayColumns.findByDayId(day.id),
        tables.dayRows.findByDayId(day.id),
      ]);

      const columns = colResult.data ?? [];
      const rows = rowResult.data ?? [];

      dayData.push({ day, columns, rows });
    }

    // Create new week
    const { data: newWeek, error: weekError } = await tables.weeks.create({
      block_id: block.id,
      week_number: weeks.length + 1,
    });

    if (weekError || !newWeek) {
      console.error("Failed to duplicate week:", weekError);
      setDuplicating(null);
      return;
    }

    // Clone each day
    for (const { day, columns, rows } of dayData) {
      const { data: newDay } = await tables.days.create({
        week_id: newWeek.id,
        day_number: day.day_number,
        name: day.name,
      });
      if (!newDay) continue;

      // Clone columns
      const columnIdMap = new Map<string, string>();
      if (columns.length > 0) {
        const { data: newCols } = await tables.dayColumns.createMany(
          columns.map((col) => ({
            day_id: newDay.id,
            label: col.label,
            order: col.order,
          })),
        );
        if (newCols) {
          for (let i = 0; i < columns.length; i++) {
            columnIdMap.set(columns[i].id, newCols[i].id);
          }
        }
      }

      // Clone rows with remapped cells
      if (rows.length > 0) {
        await tables.dayRows.createMany(
          rows.map((row) => ({
            day_id: newDay.id,
            order: row.order,
            cells: remapCellKeys(row.cells, columnIdMap),
          })),
        );
      }
    }

    setWeeks((prev) => [...prev, newWeek]);
    setSelectedTab(newWeek.id);
    setDuplicating(null);
  }

  const backButton = onBack ? (
    <button
      type="button"
      onClick={onBack}
      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 md:hidden"
    >
      <ArrowLeft size={14} />
      {block.name}
    </button>
  ) : null;

  if (loading) {
    return (
      <div className="p-6">
        {backButton}
        <div className="flex h-full items-center justify-center">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (weeks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        {backButton}
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
          <Calendar size={16} className="text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          No weeks in this block yet
        </p>
        <Button
          size="sm"
          onClick={handleCreateWeek}
          disabled={creatingWeek}
        >
          {creatingWeek ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          Create Week
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {backButton}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="flex items-center gap-2 overflow-x-auto">
          <TabsList variant="line" className="flex-nowrap">
            {weeks.map((week) => (
              <div key={week.id} className="group relative flex items-center">
                <TabsTrigger value={week.id}>
                  Week {week.week_number}
                </TabsTrigger>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      {duplicating === week.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <MoreHorizontal size={12} />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() => handleDuplicateWeek(week)}
                      disabled={duplicating !== null}
                    >
                      <Copy size={14} />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openDeleteWeek(week)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 size={14} />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </TabsList>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCreateWeek}
            disabled={creatingWeek}
          >
            {creatingWeek ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
          </Button>
        </div>

        {weeks.map((week) => (
          <TabsContent key={week.id} value={week.id}>
            <WeekContent weekId={week.id} />
          </TabsContent>
        ))}
      </Tabs>

      {/* Delete Week Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Week</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                Week {deleteTarget?.week_number}
              </span>
              ? This will remove all days and data within this week. This action
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
              onClick={handleDeleteWeek}
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
