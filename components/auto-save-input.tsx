"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AutoSaveInputProps {
  rowId: string;
  columnId: string;
  initialValue: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function AutoSaveInput({
  rowId,
  columnId,
  initialValue,
}: AutoSaveInputProps) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValueRef = useRef(initialValue);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const save = useCallback(
    async (val: string) => {
      if (val === latestValueRef.current) return;
      latestValueRef.current = val;
      setStatus("saving");

      const supabase = createClient();
      const tables = createTables(supabase);
      const { error } = await tables.dayCells.upsertMany([
        { day_row_id: rowId, day_column_id: columnId, value: val },
      ]);

      if (error) {
        console.error("Failed to save cell:", error);
        setStatus("error");
        return;
      }

      setStatus("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setStatus("idle"), 1500);
    },
    [rowId, columnId],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    setValue(newValue);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(newValue), 600);
  }

  function handleBlur() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    save(value);
  }

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          "h-8 text-sm pr-7",
          status === "error" && "ring-1 ring-destructive",
        )}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        {status === "saving" && (
          <Loader2 size={14} className="animate-spin text-muted-foreground" />
        )}
        {status === "saved" && (
          <Check size={14} className="text-emerald-500" />
        )}
      </div>
    </div>
  );
}
