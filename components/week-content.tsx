"use client";

import { useState } from "react";
import { Plus, CalendarDays, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayCard } from "@/components/day-card";
import { CreateDayDialog } from "@/components/create-day-dialog";
import { ImportDayDialog } from "@/components/import-day-dialog";
import { useBlockCache } from "@/lib/contexts/block-cache-context";

interface WeekContentProps {
  weekId: string;
}

export function WeekContent({ weekId }: WeekContentProps) {
  const { getDays, getColumns, cacheInsertDay } = useBlockCache();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const days = getDays(weekId);

  function handleOpenCreateDialog() {
    setDialogOpen(true);
  }

  // Column suggestions from the last day in this week (instant from cache)
  const suggestedColumns =
    days.length > 0
      ? getColumns(days[days.length - 1].id).map((c) => c.label)
      : [];

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
          <CalendarDays size={16} className="text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          No days in this week yet
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleOpenCreateDialog}>
            <Plus size={16} />
            Add Day
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setImportOpen(true)}
          >
            <Upload size={16} />
            Import Day
          </Button>
        </div>

        <CreateDayDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          weekId={weekId}
          nextDayNumber={1}
          suggestedColumns={suggestedColumns}
          onDayCreated={(day, columns) =>
            cacheInsertDay(weekId, day, columns)
          }
        />
        <ImportDayDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          weekId={weekId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {days.map((day) => (
        <DayCard key={day.id} day={day} />
      ))}

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenCreateDialog}
          className="text-muted-foreground"
        >
          <Plus size={14} />
          Add Day
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={() => setImportOpen(true)}
          title="Import Day"
        >
          <Upload size={14} />
        </Button>
      </div>

      <CreateDayDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        weekId={weekId}
        nextDayNumber={days.length + 1}
        suggestedColumns={suggestedColumns}
        onDayCreated={(day, columns) => cacheInsertDay(weekId, day, columns)}
      />
      <ImportDayDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        weekId={weekId}
      />
    </div>
  );
}
