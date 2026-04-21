import { SupabaseClient } from "@supabase/supabase-js";
import type { PersonalBest, PersonalBestInsert, DbResult } from "@/lib/types/database";

export class PersonalBestTable {
  protected tableName = "personal_bests";
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async findByUserId(userId: string): Promise<DbResult<PersonalBest[]>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("created_by", userId)
      .order("recorded_at", { ascending: false });
    return { data: data as PersonalBest[] | null, error: error?.message ?? null };
  }

  /** Upsert a competition PB (unique per created_by + lift + competition_id). */
  async upsertCompetitionPb(record: PersonalBestInsert): Promise<DbResult<PersonalBest>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .upsert(record, { onConflict: "created_by,lift,competition_id" })
      .select()
      .single();
    return { data: data as PersonalBest | null, error: error?.message ?? null };
  }

  /** Insert a new gym PB entry (always creates a new history row). */
  async insertGymPb(record: PersonalBestInsert): Promise<DbResult<PersonalBest>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(record)
      .select()
      .single();
    return { data: data as PersonalBest | null, error: error?.message ?? null };
  }
}
