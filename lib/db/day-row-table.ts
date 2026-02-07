import { SupabaseClient } from "@supabase/supabase-js";
import {
  DayRow,
  DayRowInsert,
  DayRowUpdate,
  DbResult,
} from "@/lib/types/database";
import { BaseTable } from "./base-table";

export class DayRowTable extends BaseTable<
  DayRow,
  DayRowInsert,
  DayRowUpdate
> {
  protected tableName = "day_rows";

  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async findByDayId(dayId: string): Promise<DbResult<DayRow[]>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("day_id", dayId)
      .order("order");
    return { data: data as DayRow[] | null, error: this.toError(error) };
  }
}
