"use server";

import { createClient } from "@/lib/supabase/server";
import { createTables } from "@/lib/db";
import type { CoachAthleteInitiatorRole } from "@/lib/types/database";

export async function lookupUserByEmail(
  email: string,
): Promise<{ id: string; display_name: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_user_by_email", {
    lookup_email: email.trim().toLowerCase(),
  });
  if (error || !data?.length) return null;
  return data[0] as { id: string; display_name: string };
}

export async function sendCoachRequest(
  email: string,
  role: CoachAthleteInitiatorRole,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const found = await lookupUserByEmail(email);
  if (!found) return { error: "No user found with that email" };

  if (found.id === user.id) return { error: "You cannot add yourself" };

  const tables = createTables(supabase);

  const insert =
    role === "coach"
      ? { coach_id: user.id, athlete_id: found.id, initiator_role: "coach" as const }
      : { coach_id: found.id, athlete_id: user.id, initiator_role: "athlete" as const };

  const { error } = await tables.coachAthletes.sendRequest(insert);
  return { error };
}

export async function respondToRequest(
  id: string,
  action: "accept" | "decline",
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const tables = createTables(supabase);
  const { error } =
    action === "accept"
      ? await tables.coachAthletes.acceptRequest(id)
      : await tables.coachAthletes.declineRequest(id);
  return { error };
}

export async function removeRelationship(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const tables = createTables(supabase);
  const { error } = await tables.coachAthletes.removeRelationship(id);
  return { error };
}
