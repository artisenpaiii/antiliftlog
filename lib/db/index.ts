import { SupabaseClient } from "@supabase/supabase-js";
import { ProgramTable } from "./program-table";
import { BlockTable } from "./block-table";
import { WeekTable } from "./week-table";
import { DayTable } from "./day-table";
import { DayColumnTable } from "./day-column-table";
import { DayRowTable } from "./day-row-table";
import { CompetitionTable } from "./competition-table";
import { StatsSettingsTable } from "./stats-settings-table";

export {
  ProgramTable,
  BlockTable,
  WeekTable,
  DayTable,
  DayColumnTable,
  DayRowTable,
  CompetitionTable,
  StatsSettingsTable,
};

export interface Tables {
  programs: ProgramTable;
  blocks: BlockTable;
  weeks: WeekTable;
  days: DayTable;
  dayColumns: DayColumnTable;
  dayRows: DayRowTable;
  competitions: CompetitionTable;
  statsSettings: StatsSettingsTable;
}

export function createTables(supabase: SupabaseClient): Tables {
  return {
    programs: new ProgramTable(supabase),
    blocks: new BlockTable(supabase),
    weeks: new WeekTable(supabase),
    days: new DayTable(supabase),
    dayColumns: new DayColumnTable(supabase),
    dayRows: new DayRowTable(supabase),
    competitions: new CompetitionTable(supabase),
    statsSettings: new StatsSettingsTable(supabase),
  };
}
