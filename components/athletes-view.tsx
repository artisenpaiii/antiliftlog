"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ArrowLeft, Loader2, Users2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient, createRealtimeClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import { BlockDetail } from "@/components/block-detail";
import { cn } from "@/lib/utils";
import type { CoachAthleteWithProfile, Program, Block } from "@/lib/types/database";

interface AthletesViewProps {
  initialAthletes: CoachAthleteWithProfile[];
}

type ContentView =
  | { kind: "programs" }
  | { kind: "blocks"; program: Program }
  | { kind: "block"; program: Program; block: Block };

function AthleteContent({ athleteId }: { athleteId: string }) {
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [view, setView] = useState<ContentView>({ kind: "programs" });

  // Create program
  const [showProgramCreate, setShowProgramCreate] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [creatingProgram, setCreatingProgram] = useState(false);

  // Create block
  const [showBlockCreate, setShowBlockCreate] = useState(false);
  const [newBlockName, setNewBlockName] = useState("");
  const [creatingBlock, setCreatingBlock] = useState(false);

  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    setView({ kind: "programs" });
    setPrograms(null);
    setBlocks(null);

    let cancelled = false;
    let cleanupRt: (() => void) | undefined;
    const supabase = createClient();
    const tables = createTables(supabase);

    const refreshPrograms = () => {
      if (cancelled) return;
      tables.programs.findByUserId(athleteId).then(({ data }) => {
        if (!cancelled) setPrograms(data ?? []);
      });
    };

    refreshPrograms();

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session?.access_token) return;
      const rtClient = createRealtimeClient(session.access_token);
      const channel = rtClient
        .channel(`programs-athlete-${athleteId}`)
        .on("postgres_changes", {
          event: "*", schema: "public", table: "programs",
        }, refreshPrograms)
        .subscribe();
      cleanupRt = () => rtClient.removeChannel(channel);
      if (cancelled) cleanupRt();
    })();

    return () => {
      cancelled = true;
      cleanupRt?.();
    };
  }, [athleteId]);

  useEffect(() => {
    if (view.kind !== "blocks") return;
    setBlocks(null);

    let cancelled = false;
    let cleanupRt: (() => void) | undefined;
    const supabase = createClient();
    const tables = createTables(supabase);
    const programId = view.program.id;

    const refreshBlocks = () => {
      if (cancelled) return;
      tables.blocks.findByProgramId(programId).then(({ data }) => {
        if (!cancelled) setBlocks(data ?? []);
      });
    };

    refreshBlocks();

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session?.access_token) return;
      const rtClient = createRealtimeClient(session.access_token);
      const channel = rtClient
        .channel(`blocks-program-${programId}`)
        .on("postgres_changes", {
          event: "*", schema: "public", table: "blocks",
        }, refreshBlocks)
        .subscribe();
      cleanupRt = () => rtClient.removeChannel(channel);
      if (cancelled) cleanupRt();
    })();

    return () => {
      cancelled = true;
      cleanupRt?.();
    };
  }, [view]);

  async function handleCreateProgram(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newProgramName.trim();
    if (!trimmed || creatingProgram) return;
    setCreatingProgram(true);
    setCreateError(null);

    const supabase = createClient();
    const tables = createTables(supabase);
    const { data: created, error } = await tables.programs.create({ name: trimmed, created_by: athleteId });

    setCreatingProgram(false);
    if (error) {
      setCreateError(error);
      return;
    }
    setNewProgramName("");
    setShowProgramCreate(false);
    if (created) setPrograms((prev) => [...(prev ?? []), created]);
  }

  async function handleCreateBlock(e: React.FormEvent) {
    e.preventDefault();
    if (view.kind !== "blocks") return;
    const trimmed = newBlockName.trim();
    if (!trimmed || creatingBlock) return;
    setCreatingBlock(true);
    setCreateError(null);

    const supabase = createClient();
    const tables = createTables(supabase);
    const { data: created, error } = await tables.blocks.create({
      program_id: view.program.id,
      name: trimmed,
      order: blocks?.length ?? 0,
      start_date: null,
    });

    setCreatingBlock(false);
    if (error) {
      setCreateError(error);
      return;
    }
    setNewBlockName("");
    setShowBlockCreate(false);
    if (created) setBlocks((prev) => [...(prev ?? []), created]);
  }

  if (view.kind === "block") {
    return (
      <div className="flex flex-col gap-4 min-w-0">
        <button
          onClick={() => setView({ kind: "blocks", program: view.program })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          <ArrowLeft size={14} />
          {view.program.name}
        </button>
        <BlockDetail block={view.block} enableRealtime />
      </div>
    );
  }

  if (view.kind === "blocks") {
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => setView({ kind: "programs" })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          <ArrowLeft size={14} />
          Programs
        </button>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{view.program.name}</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => { setShowBlockCreate((v) => !v); setCreateError(null); }}
          >
            <Plus size={14} />
          </Button>
        </div>

        {showBlockCreate && (
          <form onSubmit={handleCreateBlock} className="flex gap-2">
            <Input
              autoFocus
              value={newBlockName}
              onChange={(e) => setNewBlockName(e.target.value)}
              placeholder="Block name"
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === "Escape" && setShowBlockCreate(false)}
            />
            <Button type="submit" size="sm" className="h-8" disabled={!newBlockName.trim() || creatingBlock}>
              {creatingBlock ? <Loader2 size={12} className="animate-spin" /> : "Add"}
            </Button>
          </form>
        )}

        {createError && <p className="text-sm text-destructive">{createError}</p>}

        {blocks === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 size={14} className="animate-spin" />
            Loading blocks…
          </div>
        ) : blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blocks yet.</p>
        ) : (
          <ul className="space-y-1">
            {blocks.map((block) => (
              <li key={block.id}>
                <button
                  onClick={() => setView({ kind: "block", program: view.program, block })}
                  className="w-full flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-secondary transition-colors"
                >
                  <span>{block.name}</span>
                  <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Programs view
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Programs</h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => { setShowProgramCreate((v) => !v); setCreateError(null); }}
        >
          <Plus size={14} />
        </Button>
      </div>

      {showProgramCreate && (
        <form onSubmit={handleCreateProgram} className="flex gap-2">
          <Input
            autoFocus
            value={newProgramName}
            onChange={(e) => setNewProgramName(e.target.value)}
            placeholder="Program name"
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Escape" && setShowProgramCreate(false)}
          />
          <Button type="submit" size="sm" className="h-8" disabled={!newProgramName.trim() || creatingProgram}>
            {creatingProgram ? <Loader2 size={12} className="animate-spin" /> : "Add"}
          </Button>
        </form>
      )}

      {createError && <p className="text-sm text-destructive">{createError}</p>}

      {programs === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 size={14} className="animate-spin" />
          Loading programs…
        </div>
      ) : programs.length === 0 ? (
        <p className="text-sm text-muted-foreground">This athlete has no programs yet.</p>
      ) : (
        <ul className="space-y-1">
          {programs.map((program) => (
            <li key={program.id}>
              <button
                onClick={() => setView({ kind: "blocks", program })}
                className="w-full flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-secondary transition-colors"
              >
                <span>{program.name}</span>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AthletesView({ initialAthletes }: AthletesViewProps) {
  const [activeAthleteId, setActiveAthleteId] = useState<string>(
    initialAthletes[0]?.relationship.athlete_id ?? "",
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Users2 size={20} className="text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Athletes</h1>
      </div>

      {/* Tab bar */}
      <div className="overflow-x-auto scrollbar-none -mx-1">
        <nav className="flex items-end gap-1 min-w-max px-1 border-b border-border/40">
          {initialAthletes.map((a) => {
            const name =
              a.athlete.display_name.trim() || a.athlete.email.split("@")[0];
            const isActive = activeAthleteId === a.relationship.athlete_id;
            return (
              <button
                key={a.relationship.id}
                onClick={() => setActiveAthleteId(a.relationship.athlete_id)}
                title={name}
                className={cn(
                  "relative shrink-0 px-4 py-2 text-sm rounded-t-md transition-colors",
                  isActive
                    ? "bg-secondary text-foreground font-medium after:absolute after:bottom-0 after:inset-x-0 after:h-px after:bg-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                )}
              >
                {name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="min-w-0">
        {activeAthleteId ? (
          <AthleteContent key={activeAthleteId} athleteId={activeAthleteId} />
        ) : (
          <p className="text-sm text-muted-foreground">Select an athlete.</p>
        )}
      </div>
    </div>
  );
}
