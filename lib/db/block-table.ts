import { SupabaseClient } from "@supabase/supabase-js";
import {
  Block,
  BlockInsert,
  BlockUpdate,
  DbResult,
} from "@/lib/types/database";
import { BaseTable } from "./base-table";

export class BlockTable extends BaseTable<Block, BlockInsert, BlockUpdate> {
  protected tableName = "blocks";

  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async findByProgramId(programId: string): Promise<DbResult<Block[]>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("program_id", programId)
      .order("order");
    return { data: data as Block[] | null, error: this.toError(error) };
  }
}
