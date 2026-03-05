"use client";

import { useState } from "react";
import { Download, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import { loadProgramHierarchy, formatProgramExport } from "@/lib/stats";
import type { Program } from "@/lib/types/database";

interface ExportForAiButtonProps {
  program: Program;
}

type ExportState = "idle" | "loading" | "done";

export function ExportForAiButton({ program }: ExportForAiButtonProps) {
  const [state, setState] = useState<ExportState>("idle");

  async function handleExport() {
    if (state === "loading") return;

    setState("loading");

    try {
      const supabase = createClient();
      const tables = createTables(supabase);
      const { hierarchy, settings } = await loadProgramHierarchy(tables, program.id);
      const json = formatProgramExport(program, hierarchy, settings);

      const filename = `${program.name.replace(/[^a-zA-Z0-9-_ ]/g, "").trim()}.json`;
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      console.error("Export failed:", err);
      setState("idle");
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={handleExport}
      disabled={state === "loading"}
      title="Export program data for AI analysis"
    >
      {state === "idle" && <Download size={16} />}
      {state === "loading" && <Loader2 size={16} className="animate-spin" />}
      {state === "done" && <Check size={16} className="text-emerald-400" />}
    </Button>
  );
}
