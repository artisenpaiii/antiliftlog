"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatsSidebar } from "@/components/stats-sidebar";
import { StatsDetail } from "@/components/stats-detail";
import { CompetitionStats } from "@/components/competition-stats";
import type { Program, Competition } from "@/lib/types/database";

type StatsTab = "programs" | "competitions";

interface StatsPageProps {
  initialPrograms: Program[];
  initialCompetitions: Competition[];
}

export function StatsPage({
  initialPrograms,
  initialCompetitions,
}: StatsPageProps) {
  const [programs] = useState<Program[]>(initialPrograms);
  const [competitions] = useState<Competition[]>(initialCompetitions);
  const [activeTab, setActiveTab] = useState<StatsTab>("programs");
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    null,
  );

  const selectedProgram =
    programs.find((p) => p.id === selectedProgramId) ?? null;

  return (
    <div className="flex flex-col gap-6 min-h-0 flex-1">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your progression across programs and competitions.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        <button
          onClick={() => setActiveTab("programs")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "programs"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Programs
        </button>
        <button
          onClick={() => setActiveTab("competitions")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "competitions"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Competitions
        </button>
      </div>

      {activeTab === "programs" ? (
        <div className="flex min-h-0 flex-1 rounded-lg border bg-card">
          <div
            className={cn(
              "md:w-56 md:shrink-0 md:border-r",
              selectedProgramId ? "hidden md:block" : "w-full",
            )}
          >
            <StatsSidebar
              programs={programs}
              selectedProgramId={selectedProgramId}
              onSelect={setSelectedProgramId}
            />
          </div>
          <div
            className={cn(
              "flex-1",
              selectedProgramId ? "w-full" : "hidden md:block",
            )}
          >
            {selectedProgram ? (
              <StatsDetail
                program={selectedProgram}
                onBack={() => setSelectedProgramId(null)}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                    <BarChart3 size={16} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {programs.length > 0
                      ? "Select a program to view stats"
                      : "Create a program to get started"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <CompetitionStats competitions={competitions} />
      )}
    </div>
  );
}
