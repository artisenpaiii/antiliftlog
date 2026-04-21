import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProgramTimeline } from "@/lib/coach/types";

interface CoachBlockTimelineProps {
  timeline: ProgramTimeline | null;
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function fmt(date: Date): string {
  return DATE_FMT.format(date);
}

function fmtEnd(date: Date): string {
  return DATE_FMT.format(new Date(date.getTime() - 86_400_000));
}

export function CoachBlockTimeline({ timeline }: CoachBlockTimelineProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Program Timeline</CardTitle>
        {timeline ? (
          <p className="text-xs text-muted-foreground">
            {fmt(timeline.start)} → {fmtEnd(timeline.end)}
          </p>
        ) : (
          <p className="text-xs text-destructive">
            No timeline — blocks have no start dates
          </p>
        )}
      </CardHeader>
    </Card>
  );
}
