import { SupabaseClient } from "@supabase/supabase-js";
import {
  StatsSettings,
  StatsSettingsInsert,
  StatsSettingsUpdate,
  DbResult,
} from "@/lib/types/database";
import { BaseTable } from "./base-table";

export class StatsSettingsTable extends BaseTable<
  StatsSettings,
  StatsSettingsInsert,
  StatsSettingsUpdate
> {
  protected tableName = "stats_settings";

  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async findByProgramId(programId: string): Promise<DbResult<StatsSettings>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("program_id", programId)
      .maybeSingle();
    return { data: data as StatsSettings | null, error: this.toError(error) };
  }

  async upsertByProgramId(
    programId: string,
    record: StatsSettingsInsert,
  ): Promise<DbResult<StatsSettings>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .upsert(
        { ...record, program_id: programId },
        { onConflict: "program_id" },
      )
      .select()
      .single();
    return { data: data as StatsSettings | null, error: this.toError(error) };
  }
}
