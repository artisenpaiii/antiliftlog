"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { UserPlus, Users, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import {
  lookupUserByEmail,
  sendCoachRequest,
  respondToRequest,
  removeRelationship,
} from "@/lib/actions/coach-athlete-actions";
import type {
  CoachAthleteWithProfile,
  AthleteCoachWithProfile,
} from "@/lib/types/database";

interface CoachSectionProps {
  initialAthletes: CoachAthleteWithProfile[];
  initialCoachRelationships: AthleteCoachWithProfile[];
  userId: string;
}

interface EmailLookupState {
  email: string;
  preview: string | null;
  previewId: string | null;
  error: string | null;
  looking: boolean;
}

const emptyLookup: EmailLookupState = {
  email: "",
  preview: null,
  previewId: null,
  error: null,
  looking: false,
};

function displayName(name: string, email: string): string {
  return name.trim() || email;
}

export function CoachSection({
  initialAthletes,
  initialCoachRelationships,
  userId,
}: CoachSectionProps) {
  const [athletes, setAthletes] = useState(initialAthletes);
  const [coachRels, setCoachRels] = useState(initialCoachRelationships);

  const [coachLookup, setCoachLookup] = useState<EmailLookupState>(emptyLookup);
  const [athleteLookup, setAthleteLookup] = useState<EmailLookupState>(emptyLookup);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ---- Realtime subscription ----

  const refetch = useCallback(() => {
    const supabase = createClient();
    const tables = createTables(supabase);
    Promise.all([
      tables.coachAthletes.findAthletes(userId),
      tables.coachAthletes.findCoachRelationships(userId),
    ]).then(([athletesResult, coachRelsResult]) => {
      if (athletesResult.data) setAthletes(athletesResult.data);
      if (coachRelsResult.data) setCoachRels(coachRelsResult.data);
    });
  }, [userId]);

  useEffect(() => {
    const supabase = createClient();
    const asCoach = supabase
      .channel(`car-coach-${userId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "coach_athlete_relationships",
        filter: `coach_id=eq.${userId}`,
      }, () => refetch())
      .subscribe();

    const asAthlete = supabase
      .channel(`car-athlete-${userId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "coach_athlete_relationships",
        filter: `athlete_id=eq.${userId}`,
      }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(asCoach);
      supabase.removeChannel(asAthlete);
    };
  }, [userId, refetch]);

  // ---- Derived state ----

  const acceptedCoach = coachRels.find((r) => r.relationship.status === "accepted");
  const pendingIncomingCoach = coachRels.filter(
    (r) =>
      r.relationship.status === "pending" &&
      r.relationship.initiator_role === "coach",
  );
  const pendingOutgoingCoach = coachRels.filter(
    (r) =>
      r.relationship.status === "pending" &&
      r.relationship.initiator_role === "athlete",
  );
  const pendingIncomingAthletes = athletes.filter(
    (r) =>
      r.relationship.status === "pending" &&
      r.relationship.initiator_role === "athlete",
  );
  const acceptedAthletes = athletes.filter(
    (r) => r.relationship.status === "accepted",
  );
  const pendingOutgoingAthletes = athletes.filter(
    (r) =>
      r.relationship.status === "pending" &&
      r.relationship.initiator_role === "coach",
  );

  const hasCoach = !!acceptedCoach;
  const incomingCount = pendingIncomingCoach.length + pendingIncomingAthletes.length;

  // ---- Email lookup helpers ----

  async function lookupCoach() {
    setCoachLookup((p) => ({ ...p, looking: true, preview: null, previewId: null, error: null }));
    const result = await lookupUserByEmail(coachLookup.email);
    if (!result) {
      setCoachLookup((p) => ({ ...p, looking: false, error: "No user found with that email" }));
    } else {
      setCoachLookup((p) => ({
        ...p,
        looking: false,
        preview: result.display_name || coachLookup.email,
        previewId: result.id,
        error: null,
      }));
    }
  }

  async function lookupAthlete() {
    setAthleteLookup((p) => ({ ...p, looking: true, preview: null, previewId: null, error: null }));
    const result = await lookupUserByEmail(athleteLookup.email);
    if (!result) {
      setAthleteLookup((p) => ({ ...p, looking: false, error: "No user found with that email" }));
    } else {
      setAthleteLookup((p) => ({
        ...p,
        looking: false,
        preview: result.display_name || athleteLookup.email,
        previewId: result.id,
        error: null,
      }));
    }
  }

  function handleSendCoachRequest() {
    startTransition(async () => {
      const { error } = await sendCoachRequest(coachLookup.email, "athlete");
      if (error) {
        setCoachLookup((p) => ({ ...p, error }));
      } else {
        setCoachLookup(emptyLookup);
        refetch();
      }
    });
  }

  function handleSendAthleteInvite() {
    startTransition(async () => {
      const { error } = await sendCoachRequest(athleteLookup.email, "coach");
      if (error) {
        setAthleteLookup((p) => ({ ...p, error }));
      } else {
        setAthleteLookup(emptyLookup);
        refetch();
      }
    });
  }

  function handleRespond(id: string, action: "accept" | "decline") {
    setActionError(null);
    startTransition(async () => {
      const { error } = await respondToRequest(id, action);
      if (error) { setActionError(error); return; }
      refetch();
    });
  }

  function handleRemove(id: string) {
    setActionError(null);
    startTransition(async () => {
      const { error } = await removeRelationship(id);
      if (error) { setActionError(error); return; }
      refetch();
    });
  }

  return (
    <div className="rounded-lg border border-border p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Users size={18} className="text-muted-foreground" />
        <h2 className="text-lg font-semibold">Coach & Athletes</h2>
      </div>

      {/* ── FIND ── */}

      {!hasCoach && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Find a Coach</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Coach's email"
              value={coachLookup.email}
              onChange={(e) =>
                setCoachLookup((p) => ({ ...p, email: e.target.value, preview: null, previewId: null, error: null }))
              }
              onKeyDown={(e) => e.key === "Enter" && lookupCoach()}
              className="max-w-xs"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={lookupCoach}
              disabled={!coachLookup.email.trim() || coachLookup.looking}
            >
              {coachLookup.looking ? <Loader2 size={14} className="animate-spin" /> : "Find"}
            </Button>
          </div>
          {coachLookup.error && (
            <p className="text-sm text-destructive">{coachLookup.error}</p>
          )}
          {coachLookup.preview && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Found: <span className="text-foreground font-medium">{coachLookup.preview}</span>
              </p>
              <Button size="sm" onClick={handleSendCoachRequest} disabled={isPending}>
                <UserPlus size={14} className="mr-1" />
                Request Coach
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Invite an Athlete</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Athlete's email"
            value={athleteLookup.email}
            onChange={(e) =>
              setAthleteLookup((p) => ({ ...p, email: e.target.value, preview: null, previewId: null, error: null }))
            }
            onKeyDown={(e) => e.key === "Enter" && lookupAthlete()}
            className="max-w-xs"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={lookupAthlete}
            disabled={!athleteLookup.email.trim() || athleteLookup.looking}
          >
            {athleteLookup.looking ? <Loader2 size={14} className="animate-spin" /> : "Find"}
          </Button>
        </div>
        {athleteLookup.error && (
          <p className="text-sm text-destructive">{athleteLookup.error}</p>
        )}
        {athleteLookup.preview && (
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Found: <span className="text-foreground font-medium">{athleteLookup.preview}</span>
            </p>
            <Button size="sm" onClick={handleSendAthleteInvite} disabled={isPending}>
              <UserPlus size={14} className="mr-1" />
              Invite
            </Button>
          </div>
        )}
      </div>

      {/* ── INCOMING ── */}

      {incomingCount > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Incoming Requests</h3>

          {pendingIncomingCoach.map((r) => (
            <div
              key={r.relationship.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm">{displayName(r.coach.display_name, r.coach.email)}</p>
                <p className="text-xs text-muted-foreground">Wants to be your coach</p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-emerald-400 hover:text-emerald-300"
                  onClick={() => handleRespond(r.relationship.id, "accept")}
                  disabled={isPending}
                >
                  <Check size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleRespond(r.relationship.id, "decline")}
                  disabled={isPending}
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          ))}

          {pendingIncomingAthletes.map((r) => (
            <div
              key={r.relationship.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm">{displayName(r.athlete.display_name, r.athlete.email)}</p>
                <p className="text-xs text-muted-foreground">Requesting you as coach</p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-emerald-400 hover:text-emerald-300"
                  onClick={() => handleRespond(r.relationship.id, "accept")}
                  disabled={isPending}
                >
                  <Check size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleRespond(r.relationship.id, "decline")}
                  disabled={isPending}
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── RELATIONS ── */}

      {(hasCoach ||
        acceptedAthletes.length > 0 ||
        pendingOutgoingCoach.length > 0 ||
        pendingOutgoingAthletes.length > 0) && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Relationships</h3>

          {hasCoach && (
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm">
                  {displayName(acceptedCoach!.coach.display_name, acceptedCoach!.coach.email)}
                </p>
                <p className="text-xs text-muted-foreground">Your coach</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(acceptedCoach!.relationship.id)}
                disabled={isPending}
              >
                Remove
              </Button>
            </div>
          )}

          {acceptedAthletes.map((r) => (
            <div
              key={r.relationship.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm">{displayName(r.athlete.display_name, r.athlete.email)}</p>
                <p className="text-xs text-muted-foreground">Athlete</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(r.relationship.id)}
                disabled={isPending}
              >
                Remove
              </Button>
            </div>
          ))}

          {pendingOutgoingCoach.map((r) => (
            <div
              key={r.relationship.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm text-muted-foreground">
                  {displayName(r.coach.display_name, r.coach.email)}
                </p>
                <p className="text-xs text-muted-foreground">Pending — coach request sent</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(r.relationship.id)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          ))}

          {pendingOutgoingAthletes.map((r) => (
            <div
              key={r.relationship.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm text-muted-foreground">
                  {displayName(r.athlete.display_name, r.athlete.email)}
                </p>
                <p className="text-xs text-muted-foreground">Pending — invite sent</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(r.relationship.id)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          ))}
        </div>
      )}

      {actionError && (
        <p className="text-sm text-destructive">{actionError}</p>
      )}

      {!hasCoach &&
        incomingCount === 0 &&
        acceptedAthletes.length === 0 &&
        pendingOutgoingCoach.length === 0 &&
        pendingOutgoingAthletes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No coaching relationships yet.
          </p>
        )}
    </div>
  );
}
