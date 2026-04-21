import { CoachInsightCard } from "@/components/coach-insight-card";
import type { Pattern } from "@/lib/coach/types";

interface CoachPatternListProps {
  patterns: Pattern[];
}

export function CoachPatternList({ patterns }: CoachPatternListProps) {
  if (patterns.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
        Not enough data yet. Arti needs at least 2 competition prep cycles to find reliable patterns.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Patterns Detected
      </h2>
      <div className="space-y-3">
        {patterns.map((pattern) => (
          <CoachInsightCard
            key={pattern.patternId}
            title={`Pattern · ${pattern.count}×`}
            insight={pattern.description}
            rule={pattern.rule}
            supportLabel={`${pattern.count} blocks`}
          />
        ))}
      </div>
    </div>
  );
}
