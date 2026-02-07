"use client";

import { useState } from "react";
import { Layers, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import type { Block } from "@/lib/types/database";

interface BlockSidebarProps {
  programId: string;
  blocks: Block[];
  selectedBlockId: string | null;
  onSelect: (blockId: string) => void;
  onBlockCreated: (block: Block) => void;
  onBlockUpdated: (block: Block) => void;
  onBlockDeleted: (blockId: string) => void;
}

export function BlockSidebar({
  programId,
  blocks,
  selectedBlockId,
  onSelect,
  onBlockCreated,
  onBlockUpdated,
  onBlockDeleted,
}: BlockSidebarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rename state
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Block | null>(null);
  const [renameName, setRenameName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Block | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsCreating(true);
    setError(null);

    const supabase = createClient();
    const tables = createTables(supabase);
    const { data, error: createError } = await tables.blocks.create({
      program_id: programId,
      name: trimmed,
      order: blocks.length,
    });

    if (createError || !data) {
      setError(createError ?? "Failed to create block");
      setIsCreating(false);
      return;
    }

    setCreateOpen(false);
    setIsCreating(false);
    setName("");
    onBlockCreated(data);
  }

  function handleOpenChange(open: boolean) {
    setCreateOpen(open);
    if (!open) {
      setName("");
      setError(null);
    }
  }

  function openRename(block: Block) {
    setRenameTarget(block);
    setRenameName(block.name);
    setRenameError(null);
    setRenameOpen(true);
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameTarget) return;

    const trimmed = renameName.trim();
    if (!trimmed || trimmed === renameTarget.name) {
      setRenameOpen(false);
      return;
    }

    setIsRenaming(true);
    setRenameError(null);

    const supabase = createClient();
    const tables = createTables(supabase);
    const { data, error } = await tables.blocks.update(renameTarget.id, {
      name: trimmed,
    });

    if (error || !data) {
      setRenameError(error ?? "Failed to rename block");
      setIsRenaming(false);
      return;
    }

    setRenameOpen(false);
    setIsRenaming(false);
    onBlockUpdated(data);
  }

  function openDelete(block: Block) {
    setDeleteTarget(block);
    setDeleteError(null);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    const supabase = createClient();
    const tables = createTables(supabase);
    const { error } = await tables.blocks.delete(deleteTarget.id);

    if (error) {
      setDeleteError(error);
      setIsDeleting(false);
      return;
    }

    setDeleteOpen(false);
    setIsDeleting(false);
    onBlockDeleted(deleteTarget.id);
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4">
        <span className="text-sm font-medium text-muted-foreground">
          Blocks
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

      {blocks.length === 0 ? (
        <div className="mx-4 rounded-lg border border-dashed border-border p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
            <Layers size={16} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">No blocks yet</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            Create Block
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1 px-2">
          {blocks.map((block) => (
            <div
              key={block.id}
              className={cn(
                "group flex items-center rounded-md transition-colors",
                selectedBlockId === block.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <button
                onClick={() => onSelect(block.id)}
                className="flex flex-1 items-center gap-2 px-3 py-2 text-sm text-left min-w-0"
              >
                <Layers size={14} className="shrink-0" />
                <span className="truncate">{block.name}</span>
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
                  <DropdownMenuItem onClick={() => openRename(block)}>
                    <Pencil size={14} />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openDelete(block)}
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

      {/* Create Block Dialog */}
      <Dialog open={createOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create Block</DialogTitle>
              <DialogDescription>
                Add a new training block to this program.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="block-name">Block name</Label>
              <Input
                id="block-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hypertrophy Phase"
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

      {/* Rename Block Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <form onSubmit={handleRename}>
            <DialogHeader>
              <DialogTitle>Rename Block</DialogTitle>
              <DialogDescription>
                Enter a new name for this block.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="rename-block-name">Block name</Label>
              <Input
                id="rename-block-name"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                className="mt-2"
                autoFocus
              />
              {renameError && (
                <p className="text-destructive text-sm mt-2">{renameError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRenaming || !renameName.trim()}
              >
                {isRenaming ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Block Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Block</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? This will remove all weeks, days, and data within this block.
              This action cannot be undone.
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
