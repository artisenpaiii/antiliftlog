"use client";

import { useState } from "react";
import { Trophy, Plus, MoreHorizontal, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Competition } from "@/lib/types/database";

interface CompetitionSidebarProps {
  competitions: Competition[];
  selectedCompetitionId: string | null;
  onSelect: (id: string) => void;
  onCompetitionCreated: (comp: Competition) => void;
  onCompetitionDeleted: (id: string) => void;
}

export function CompetitionSidebar({
  competitions,
  selectedCompetitionId,
  onSelect,
  onCompetitionCreated,
  onCompetitionDeleted,
}: CompetitionSidebarProps) {
  // Create state
  const [createOpen, setCreateOpen] = useState(false);
  const [meetName, setMeetName] = useState("");
  const [meetDate, setMeetDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Competition | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = meetName.trim();
    if (!trimmedName || !meetDate) return;

    setIsCreating(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated");
      setIsCreating(false);
      return;
    }

    const tables = createTables(supabase);
    const { data, error: createError } = await tables.competitions.create({
      created_by: user.id,
      meet_name: trimmedName,
      meet_date: meetDate,
      weight_class: null,
      bodyweight_kg: null,
      squat_1_kg: null,
      squat_1_good: null,
      squat_2_kg: null,
      squat_2_good: null,
      squat_3_kg: null,
      squat_3_good: null,
      bench_1_kg: null,
      bench_1_good: null,
      bench_2_kg: null,
      bench_2_good: null,
      bench_3_kg: null,
      bench_3_good: null,
      deadlift_1_kg: null,
      deadlift_1_good: null,
      deadlift_2_kg: null,
      deadlift_2_good: null,
      deadlift_3_kg: null,
      deadlift_3_good: null,
      placing_rank: null,
      notes: null,
    });

    if (createError || !data) {
      setError(createError ?? "Failed to create competition");
      setIsCreating(false);
      return;
    }

    setCreateOpen(false);
    setIsCreating(false);
    setMeetName("");
    setMeetDate("");
    onCompetitionCreated(data);
  }

  function handleCreateOpenChange(open: boolean) {
    setCreateOpen(open);
    if (!open) {
      setMeetName("");
      setMeetDate("");
      setError(null);
    }
  }

  function openDelete(comp: Competition) {
    setDeleteTarget(comp);
    setDeleteError(null);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    const supabase = createClient();
    const tables = createTables(supabase);
    const { error } = await tables.competitions.delete(deleteTarget.id);

    if (error) {
      setDeleteError(error);
      setIsDeleting(false);
      return;
    }

    setDeleteOpen(false);
    setIsDeleting(false);
    onCompetitionDeleted(deleteTarget.id);
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4">
        <span className="text-sm font-medium text-muted-foreground">
          Competitions
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={16} />
        </Button>
      </div>

      {competitions.length === 0 ? (
        <div className="mx-4 rounded-lg border border-dashed border-border p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
            <Trophy size={16} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">No competitions yet</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            Add Competition
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1 px-2">
          {competitions.map((comp) => (
            <div
              key={comp.id}
              className={cn(
                "group flex items-center rounded-md transition-colors",
                selectedCompetitionId === comp.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <button
                onClick={() => onSelect(comp.id)}
                className="flex flex-1 flex-col gap-0.5 px-3 py-2 text-left min-w-0"
              >
                <span className="text-sm truncate">{comp.meet_name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(comp.meet_date)}
                </span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <MoreHorizontal size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => openDelete(comp)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 size={14} />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Create Competition Dialog */}
      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add Competition</DialogTitle>
              <DialogDescription>
                Record a new competition result.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="comp-meet-name">Meet name</Label>
                <Input
                  id="comp-meet-name"
                  value={meetName}
                  onChange={(e) => setMeetName(e.target.value)}
                  placeholder="e.g. USAPL Nationals"
                  className="mt-2"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="comp-meet-date">Date</Label>
                <Input
                  id="comp-meet-date"
                  type="date"
                  value={meetDate}
                  onChange={(e) => setMeetDate(e.target.value)}
                  className="mt-2"
                />
              </div>
              {error && (
                <p className="text-destructive text-sm">{error}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !meetName.trim() || !meetDate}
              >
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Competition Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Competition</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.meet_name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-destructive text-sm">{deleteError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
