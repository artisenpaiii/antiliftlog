import { SupabaseClient } from "@supabase/supabase-js";
import {
  Competition,
  CompetitionInsert,
  CompetitionUpdate,
  DbResult,
} from "@/lib/types/database";
import { BaseTable } from "./base-table";

export class CompetitionTable extends BaseTable<
  Competition,
  CompetitionInsert,
  CompetitionUpdate
> {
  protected tableName = "competition";

  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async findByUserId(userId: string): Promise<DbResult<Competition[]>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("created_by", userId)
      .order("meet_date", { ascending: false });
    return { data: data as Competition[] | null, error: this.toError(error) };
  }
}
