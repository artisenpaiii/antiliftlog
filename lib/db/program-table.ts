import { SupabaseClient } from "@supabase/supabase-js";
import {
  Program,
  ProgramInsert,
  ProgramUpdate,
  DbResult,
} from "@/lib/types/database";
import { BaseTable } from "./base-table";

export class ProgramTable extends BaseTable<
  Program,
  ProgramInsert,
  ProgramUpdate
> {
  protected tableName = "programs";

  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async findByUserId(userId: string): Promise<DbResult<Program[]>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("created_by", userId);
    return { data: data as Program[] | null, error: this.toError(error) };
  }

  async findMine(): Promise<DbResult<Program[]>> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) {
      return { data: null, error: "Not authenticated" };
    }
    return this.findByUserId(user.id);
  }
}
