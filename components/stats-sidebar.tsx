"use client";

import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Program } from "@/lib/types/database";

interface StatsSidebarProps {
  programs: Program[];
  selectedProgramId: string | null;
  onSelect: (id: string) => void;
}

export function StatsSidebar({
  programs,
  selectedProgramId,
  onSelect,
}: StatsSidebarProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center p-4">
        <span className="text-sm font-medium text-muted-foreground">
          Programs
        </span>
      </div>

      {programs.length === 0 ? (
        <div className="mx-4 rounded-lg border border-dashed border-border p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
            <Dumbbell size={16} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No programs yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 px-2">
          {programs.map((program) => (
            <button
              key={program.id}
              onClick={() => onSelect(program.id)}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-left text-sm transition-colors",
                selectedProgramId === program.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <span className="truncate">{program.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
