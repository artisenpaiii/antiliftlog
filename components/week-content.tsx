"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { DayCard } from "@/components/day-card";
import { CreateDayDialog } from "@/components/create-day-dialog";
import type { Day, DayColumn } from "@/lib/types/database";

interface WeekContentProps {
  weekId: string;
}

interface DayWithColumns {
  day: Day;
  columns?: DayColumn[];
}

export function WeekContent({ weekId }: WeekContentProps) {
  const [days, setDays] = useState<DayWithColumns[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suggestedColumns, setSuggestedColumns] = useState<string[]>([]);

  const loadDays = useCallback(async () => {
    const supabase = createClient();
    const tables = createTables(supabase);
    const { data, error } = await tables.days.findByWeekId(weekId);

    if (error) {
      console.error("Failed to load days:", error);
    }

    setDays((data ?? []).map((day) => ({ day })));
    setLoading(false);
  }, [weekId]);

  useEffect(() => {
    setLoading(true);
    loadDays();
  }, [loadDays]);

  async function handleOpenCreateDialog() {
    let suggestions: string[] = [];

    if (days.length > 0) {
      const lastDay = days[days.length - 1].day;
      const supabase = createClient();
      const tables = createTables(supabase);
      const { data } = await tables.dayColumns.findByDayId(lastDay.id);
      if (data) {
        suggestions = data.map((col) => col.label);
      }
    }

    setSuggestedColumns(suggestions);
    setDialogOpen(true);
  }

  function handleDayCreated(day: Day, columns: DayColumn[]) {
    setDays((prev) => [...prev, { day, columns }]);
  }

  function handleDayDeleted(dayId: string) {
    setDays((prev) => prev.filter((d) => d.day.id !== dayId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
          <CalendarDays size={16} className="text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          No days in this week yet
        </p>
        <Button size="sm" onClick={handleOpenCreateDialog}>
          <Plus size={16} />
          Add Day
        </Button>

        <CreateDayDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          weekId={weekId}
          nextDayNumber={1}
          suggestedColumns={suggestedColumns}
          onDayCreated={handleDayCreated}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {days.map(({ day, columns }) => (
        <DayCard
          key={day.id}
          day={day}
          initialColumns={columns}
          onDeleted={handleDayDeleted}
        />
      ))}

      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpenCreateDialog}
        className="text-muted-foreground"
      >
        <Plus size={14} />
        Add Day
      </Button>

      <CreateDayDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        weekId={weekId}
        nextDayNumber={days.length + 1}
        suggestedColumns={suggestedColumns}
        onDayCreated={handleDayCreated}
      />
    </div>
  );
}
