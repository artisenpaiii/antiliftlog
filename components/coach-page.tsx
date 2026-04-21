"use client";

import { useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import type { Program, Competition, PersonalBest } from "@/lib/types/database";
import type { CoachAnalysis } from "@/lib/coach/types";
import { runCoachAnalysis } from "@/lib/coach/coach-engine";
import { CoachArtiHeader } from "@/components/coach-arti-header";
import { CoachBlockTimeline } from "@/components/coach-block-timeline";
import { CoachCompHistory } from "@/components/coach-comp-history";
import { CoachExerciseTable } from "@/components/coach-exercise-table";
import { CoachFatigueSummary } from "@/components/coach-fatigue-summary";
import { CoachPatternList } from "@/components/coach-pattern-list";

interface CoachPageProps {
  initialPrograms: Program[];
  initialCompetitions: Competition[];
  initialPersonalBests: PersonalBest[];
}

export function CoachPage({ initialPrograms, initialCompetitions, initialPersonalBests }: CoachPageProps) {
  const [analysis, setAnalysis] = useState<CoachAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generationRef = useRef(0);

  async function handleProgramSelect(programId: string) {
    generationRef.current++;
    const gen = generationRef.current;

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const supabase = createClient();
      const tables = createTables(supabase);
      const result = await runCoachAnalysis(tables, programId, initialCompetitions, initialPersonalBests);
      if (gen !== generationRef.current) return;
      setAnalysis(result);
    } catch (e) {
      if (gen !== generationRef.current) return;
      setError("Analysis failed. Please try again.");
      console.error(e);
    } finally {
      if (gen === generationRef.current) setLoading(false);
    }
  }

  const hasSettings = analysis && analysis.totalSegments > 0 || analysis?.totalSegments === 0 && !loading;
  const noSettings = analysis && analysis.totalSegments === 0 && !analysis.hasCompetitions && analysis.exerciseImpact.overall.length === 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <CoachArtiHeader />

      <div className="space-y-1.5">
        <Label className="text-sm">Select Program</Label>
        <Select onValueChange={handleProgramSelect} disabled={loading}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a program…" />
          </SelectTrigger>
          <SelectContent>
            {initialPrograms.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          <span>Analysing your training…</span>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {analysis && !loading && (
        <div className="space-y-6">
          {noSettings && (
            <p className="text-sm text-muted-foreground rounded-lg border border-border p-4">
              Configure column mapping in Stats first so Arti can read your training data.
            </p>
          )}

          {analysis.timeline && (
            <CoachBlockTimeline timeline={analysis.timeline} />
          )}

          <CoachCompHistory compHistory={analysis.compHistory} />

          {!analysis.hasCompetitions && !noSettings && (
            <p className="text-sm text-muted-foreground rounded-lg border border-border p-4">
              No competitions found in this program&apos;s timeline. Showing training patterns only.
            </p>
          )}

          {analysis.exerciseImpact.overall.length > 0 && (
            <CoachExerciseTable exerciseImpact={analysis.exerciseImpact} />
          )}

          {analysis.fatigueAnalysis.optimalZone && (
            <CoachFatigueSummary analysis={analysis.fatigueAnalysis} />
          )}

          <CoachPatternList patterns={analysis.patterns} />
        </div>
      )}
    </div>
  );
}
