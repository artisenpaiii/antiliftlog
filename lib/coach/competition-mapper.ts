import type { Competition } from "@/lib/types/database";
import type { ProgramTimeline } from "./types";

export function mapCompetitionsToProgram(
  competitions: Competition[],
  timeline: ProgramTimeline | null,
): Competition[] {
  if (!timeline) return [];

  return competitions
    .filter((comp) => {
      const date = new Date(comp.meet_date + "T00:00:00");
      return date >= timeline.start && date <= timeline.end;
    })
    .sort((a, b) => {
      const da = new Date(a.meet_date + "T00:00:00");
      const db = new Date(b.meet_date + "T00:00:00");
      return da.getTime() - db.getTime();
    });
}
