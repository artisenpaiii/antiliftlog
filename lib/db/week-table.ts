import { SupabaseClient } from "@supabase/supabase-js";
import { Week, WeekInsert, WeekUpdate, DbResult } from "@/lib/types/database";
import { BaseTable } from "./base-table";

export class WeekTable extends BaseTable<Week, WeekInsert, WeekUpdate> {
  protected tableName = "weeks";

  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async findByBlockId(blockId: string): Promise<DbResult<Week[]>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("block_id", blockId)
      .order("week_number");
    return { data: data as Week[] | null, error: this.toError(error) };
  }
}
