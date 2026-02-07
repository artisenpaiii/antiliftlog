import { SupabaseClient } from "@supabase/supabase-js";
import { DbResult } from "@/lib/types/database";

export abstract class BaseTable<Row, Insert, Update> {
  protected supabase: SupabaseClient;
  protected abstract tableName: string;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async findAll(): Promise<DbResult<Row[]>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*");
    return { data: data as Row[] | null, error: this.toError(error) };
  }

  async findById(id: string): Promise<DbResult<Row>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("id", id)
      .single();
    return { data: data as Row | null, error: this.toError(error) };
  }

  async create(record: Insert): Promise<DbResult<Row>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(record as never)
      .select()
      .single();
    return { data: data as Row | null, error: this.toError(error) };
  }

  async createMany(records: Insert[]): Promise<DbResult<Row[]>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(records as never)
      .select();
    return { data: data as Row[] | null, error: this.toError(error) };
  }

  async update(id: string, record: Update): Promise<DbResult<Row>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(record as never)
      .eq("id", id)
      .select()
      .single();
    return { data: data as Row | null, error: this.toError(error) };
  }

  async delete(id: string): Promise<DbResult<null>> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq("id", id);
    return { data: null, error: this.toError(error) };
  }

  protected toError(error: { message: string } | null): string | null {
    return error ? error.message : null;
  }
}
