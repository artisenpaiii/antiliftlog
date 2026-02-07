import { SupabaseClient } from "@supabase/supabase-js";
import {
  DayCell,
  DayCellInsert,
  DayCellUpdate,
  DbResult,
} from "@/lib/types/database";
import { BaseTable } from "./base-table";

export class DayCellTable extends BaseTable<
  DayCell,
  DayCellInsert,
  DayCellUpdate
> {
  protected tableName = "day_cells";

  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async findByRowId(rowId: string): Promise<DbResult<DayCell[]>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("day_row_id", rowId);
    return { data: data as DayCell[] | null, error: this.toError(error) };
  }

  async findByRowIds(rowIds: string[]): Promise<DbResult<DayCell[]>> {
    if (rowIds.length === 0) {
      return { data: [], error: null };
    }
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .in("day_row_id", rowIds);
    return { data: data as DayCell[] | null, error: this.toError(error) };
  }

  async findByColumnId(columnId: string): Promise<DbResult<DayCell[]>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("day_column_id", columnId);
    return { data: data as DayCell[] | null, error: this.toError(error) };
  }

  async findByPosition(
    rowId: string,
    columnId: string,
  ): Promise<DbResult<DayCell>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("day_row_id", rowId)
      .eq("day_column_id", columnId)
      .single();
    return { data: data as DayCell | null, error: this.toError(error) };
  }

  async upsertMany(records: DayCellInsert[]): Promise<DbResult<DayCell[]>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .upsert(records as never, {
        onConflict: "day_row_id,day_column_id",
      })
      .select();
    return { data: data as DayCell[] | null, error: this.toError(error) };
  }
}
