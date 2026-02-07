"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dumbbell, Plus, Trash2 } from "lucide-react";
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
import type { Program } from "@/lib/types/database";

interface ProgramListProps {
  programs: Program[];
}

export function ProgramList({ programs }: ProgramListProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

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
    const { error: createError } = await tables.programs.create({
      name: trimmed,
      created_by: user.id,
    });

    if (createError) {
      setError(createError);
      setIsCreating(false);
      return;
    }

    setCreateOpen(false);
    setIsCreating(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!selectedProgram) return;

    setIsDeleting(true);
    setError(null);

    const supabase = createClient();
    const tables = createTables(supabase);
    const { error: deleteError } = await tables.programs.delete(
      selectedProgram.id,
    );

    if (deleteError) {
      setError(deleteError);
      setIsDeleting(false);
      return;
    }

    setDeleteOpen(false);
    setIsDeleting(false);
    router.refresh();
  }

  function handleCreateOpenChange(open: boolean) {
    setCreateOpen(open);
    if (!open) {
      setName("");
      setError(null);
    }
  }

  function handleDeleteOpenChange(open: boolean) {
    setDeleteOpen(open);
    if (!open) {
      setSelectedProgram(null);
      setError(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Programs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage your training programs.
          </p>
        </div>
        {programs.length > 0 && (
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus size={16} />
            New Program
          </Button>
        )}
      </div>

      {programs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
            <Dumbbell size={20} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            No programs yet. Create your first training program to get started.
          </p>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus size={16} />
            Create Program
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {programs.map((program) => (
            <div
              key={program.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
            >
              <Link
                href={`/dashboard/programs/${program.id}`}
                className="flex flex-1 items-center gap-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent">
                  <Dumbbell size={16} className="text-muted-foreground" />
                </div>
                <span className="font-medium">{program.name}</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  setSelectedProgram(program);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create Program Dialog */}
      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create Program</DialogTitle>
              <DialogDescription>
                Give your training program a name to get started.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="program-name">Program name</Label>
              <Input
                id="program-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Strength Block A"
                className="mt-2"
                autoFocus
              />
              {error && (
                <p className="text-destructive text-sm mt-2">{error}</p>
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
              <Button type="submit" disabled={isCreating || !name.trim()}>
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Program</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {selectedProgram?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
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
