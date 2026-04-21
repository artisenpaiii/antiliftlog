import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Competition } from "@/lib/types/database";
import type { CompResults } from "@/lib/coach/types";

interface CoachCompHistoryProps {
  compHistory: Array<{ competition: Competition; results: CompResults }>;
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function fmt(dateStr: string): string {
  return DATE_FMT.format(new Date(dateStr + "T00:00:00"));
}

function kg(val: number | null): string {
  return val !== null ? `${val} kg` : "—";
}

export function CoachCompHistory({ compHistory }: CoachCompHistoryProps) {
  if (compHistory.length === 0) return null;

  const sorted = [...compHistory].sort(
    (a, b) => new Date(a.competition.meet_date).getTime() - new Date(b.competition.meet_date).getTime(),
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Competition History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.map(({ competition: comp, results }) => {
          const total =
            results.squat !== null && results.bench !== null && results.deadlift !== null
              ? results.squat + results.bench + results.deadlift
              : null;

          return (
            <div key={comp.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{comp.meet_name}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {fmt(comp.meet_date)}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                <div>
                  <div className="uppercase tracking-wide text-[10px] mb-0.5">Squat</div>
                  <div className="text-foreground font-medium">{kg(results.squat)}</div>
                </div>
                <div>
                  <div className="uppercase tracking-wide text-[10px] mb-0.5">Bench</div>
                  <div className="text-foreground font-medium">{kg(results.bench)}</div>
                </div>
                <div>
                  <div className="uppercase tracking-wide text-[10px] mb-0.5">Deadlift</div>
                  <div className="text-foreground font-medium">{kg(results.deadlift)}</div>
                </div>
                <div>
                  <div className="uppercase tracking-wide text-[10px] mb-0.5">Total</div>
                  <div className="text-foreground font-medium">{kg(total)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
