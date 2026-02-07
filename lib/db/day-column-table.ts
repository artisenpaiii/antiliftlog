import { SupabaseClient } from "@supabase/supabase-js";
import {
  DayColumn,
  DayColumnInsert,
  DayColumnUpdate,
  DbResult,
} from "@/lib/types/database";
import { BaseTable } from "./base-table";

export class DayColumnTable extends BaseTable<
  DayColumn,
  DayColumnInsert,
  DayColumnUpdate
> {
  protected tableName = "day_columns";

  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async findByDayId(dayId: string): Promise<DbResult<DayColumn[]>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("day_id", dayId)
      .order("order");
    return { data: data as DayColumn[] | null, error: this.toError(error) };
  }
}
