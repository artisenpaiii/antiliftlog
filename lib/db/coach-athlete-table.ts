import { SupabaseClient } from "@supabase/supabase-js";
import {
  CoachAthleteRelationship,
  CoachAthleteInsert,
  CoachAthleteUpdate,
  CoachAthleteWithProfile,
  AthleteCoachWithProfile,
  UserProfile,
  DbResult,
} from "@/lib/types/database";
import { BaseTable } from "./base-table";

export class CoachAthleteTable extends BaseTable<
  CoachAthleteRelationship,
  CoachAthleteInsert,
  CoachAthleteUpdate
> {
  protected tableName = "coach_athlete_relationships";

  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async findAthletes(coachId: string): Promise<DbResult<CoachAthleteWithProfile[]>> {
    const { data: relationships, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("coach_id", coachId)
      .eq("status", "accepted")
      .order("created_at");

    if (error) return { data: null, error: this.toError(error) };
    if (!relationships?.length) return { data: [], error: null };

    const athleteIds = relationships.map((r) => r.athlete_id as string);
    const { data: profiles, error: profileError } = await this.supabase.rpc(
      "get_user_profiles",
      { user_ids: athleteIds },
    );

    if (profileError) return { data: null, error: this.toError(profileError) };

    const profileMap = new Map<string, UserProfile>(
      (profiles as UserProfile[] ?? []).map((p) => [p.id, p]),
    );

    const result: CoachAthleteWithProfile[] = relationships.map((r) => ({
      relationship: r as CoachAthleteRelationship,
      athlete: profileMap.get(r.athlete_id as string) ?? {
        id: r.athlete_id as string,
        email: "",
        display_name: "",
      },
    }));

    return { data: result, error: null };
  }

  async findAllAthleteRelationships(coachId: string): Promise<DbResult<CoachAthleteWithProfile[]>> {
    const { data: relationships, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("coach_id", coachId)
      .order("created_at");

    if (error) return { data: null, error: this.toError(error) };
    if (!relationships?.length) return { data: [], error: null };

    const athleteIds = relationships.map((r) => r.athlete_id as string);
    const { data: profiles, error: profileError } = await this.supabase.rpc(
      "get_user_profiles",
      { user_ids: athleteIds },
    );

    if (profileError) return { data: null, error: this.toError(profileError) };

    const profileMap = new Map<string, UserProfile>(
      (profiles as UserProfile[] ?? []).map((p) => [p.id, p]),
    );

    const result: CoachAthleteWithProfile[] = relationships.map((r) => ({
      relationship: r as CoachAthleteRelationship,
      athlete: profileMap.get(r.athlete_id as string) ?? {
        id: r.athlete_id as string,
        email: "",
        display_name: "",
      },
    }));

    return { data: result, error: null };
  }

  async findCoachRelationships(athleteId: string): Promise<DbResult<AthleteCoachWithProfile[]>> {
    const { data: relationships, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("athlete_id", athleteId)
      .order("created_at");

    if (error) return { data: null, error: this.toError(error) };
    if (!relationships?.length) return { data: [], error: null };

    const coachIds = relationships.map((r) => r.coach_id as string);
    const { data: profiles, error: profileError } = await this.supabase.rpc(
      "get_user_profiles",
      { user_ids: coachIds },
    );

    if (profileError) return { data: null, error: this.toError(profileError) };

    const profileMap = new Map<string, UserProfile>(
      (profiles as UserProfile[] ?? []).map((p) => [p.id, p]),
    );

    const result: AthleteCoachWithProfile[] = relationships.map((r) => ({
      relationship: r as CoachAthleteRelationship,
      coach: profileMap.get(r.coach_id as string) ?? {
        id: r.coach_id as string,
        email: "",
        display_name: "",
      },
    }));

    return { data: result, error: null };
  }

  async sendRequest(insert: CoachAthleteInsert): Promise<DbResult<CoachAthleteRelationship>> {
    return this.create(insert);
  }

  async acceptRequest(id: string): Promise<DbResult<CoachAthleteRelationship>> {
    return this.update(id, { status: "accepted" });
  }

  async declineRequest(id: string): Promise<DbResult<CoachAthleteRelationship>> {
    return this.update(id, { status: "declined" });
  }

  async removeRelationship(id: string): Promise<DbResult<null>> {
    return this.delete(id);
  }
}
