import { SupabaseClient } from "@supabase/supabase-js";
import { Day, DayInsert, DayUpdate, DbResult } from "@/lib/types/database";
import { BaseTable } from "./base-table";

export class DayTable extends BaseTable<Day, DayInsert, DayUpdate> {
  protected tableName = "days";

  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async findByWeekId(weekId: string): Promise<DbResult<Day[]>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("week_id", weekId)
      .order("day_number");
    return { data: data as Day[] | null, error: this.toError(error) };
  }
}
