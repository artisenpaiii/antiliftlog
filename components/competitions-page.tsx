"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompetitionSidebar } from "@/components/competition-sidebar";
import { CompetitionDetail } from "@/components/competition-detail";
import type { Competition } from "@/lib/types/database";

interface CompetitionsPageProps {
  initialCompetitions: Competition[];
}

export function CompetitionsPage({ initialCompetitions }: CompetitionsPageProps) {
  const [competitions, setCompetitions] = useState<Competition[]>(initialCompetitions);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);

  const selectedCompetition = competitions.find((c) => c.id === selectedCompetitionId) ?? null;

  function handleCompetitionCreated(comp: Competition) {
    setCompetitions((prev) => [comp, ...prev]);
    setSelectedCompetitionId(comp.id);
  }

  function handleCompetitionUpdated(updated: Competition) {
    setCompetitions((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
  }

  function handleCompetitionDeleted(id: string) {
    setCompetitions((prev) => prev.filter((c) => c.id !== id));
    if (selectedCompetitionId === id) {
      setSelectedCompetitionId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 min-h-0 flex-1">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Competitions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your meet results and competition history.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 rounded-lg border bg-card">
        <div
          className={cn(
            "md:w-56 md:shrink-0 md:border-r",
            selectedCompetitionId ? "hidden md:block" : "w-full",
          )}
        >
          <CompetitionSidebar
            competitions={competitions}
            selectedCompetitionId={selectedCompetitionId}
            onSelect={setSelectedCompetitionId}
            onCompetitionCreated={handleCompetitionCreated}
            onCompetitionDeleted={handleCompetitionDeleted}
          />
        </div>
        <div
          className={cn(
            "flex-1",
            selectedCompetitionId ? "w-full" : "hidden md:block",
          )}
        >
          {selectedCompetition ? (
            <CompetitionDetail
              competition={selectedCompetition}
              onBack={() => setSelectedCompetitionId(null)}
              onCompetitionUpdated={handleCompetitionUpdated}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Trophy size={16} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {competitions.length > 0
                    ? "Select a competition to view details"
                    : "Add a competition to get started"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
