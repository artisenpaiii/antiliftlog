"use client";

import { useState } from "react";
import { ArrowLeft, Calendar, Plus, Loader2, MoreHorizontal, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WeekContent } from "@/components/week-content";
import { BlockCacheProvider, useBlockCache } from "@/lib/contexts/block-cache-context";
import type { Block, Week } from "@/lib/types/database";

interface BlockDetailProps {
  block: Block;
  onBack?: () => void;
}

export function BlockDetail({ block, onBack }: BlockDetailProps) {
  return (
    <BlockCacheProvider blockId={block.id}>
      <BlockDetailInner block={block} onBack={onBack} />
    </BlockCacheProvider>
  );
}

function BlockDetailInner({ block, onBack }: BlockDetailProps) {
  const { loading, weeks, addWeek, deleteWeek, duplicateWeek } = useBlockCache();

  const [selectedTab, setSelectedTab] = useState<string>("");
  const [creatingWeek, setCreatingWeek] = useState(false);

  // Delete week state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Week | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Duplicate week state
  const [duplicating, setDuplicating] = useState<string | null>(null);

  // Auto-select first tab when weeks load
  if (!loading && weeks.length > 0 && !selectedTab) {
    setSelectedTab(weeks[0].id);
  }

  async function handleCreateWeek() {
    setCreatingWeek(true);
    const newWeek = await addWeek({
      block_id: block.id,
      week_number: weeks.length + 1,
    });

    if (newWeek) {
      setSelectedTab(newWeek.id);
    }
    setCreatingWeek(false);
  }

  function openDeleteWeek(week: Week) {
    setDeleteTarget(week);
    setDeleteError(null);
    setDeleteOpen(true);
  }

  async function handleDeleteWeek() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    const success = await deleteWeek(deleteTarget.id);

    if (!success) {
      setDeleteError("Failed to delete week");
      setIsDeleting(false);
      return;
    }

    // Adjust selected tab
    if (selectedTab === deleteTarget.id) {
      const idx = weeks.findIndex((w) => w.id === deleteTarget.id);
      const filtered = weeks.filter((w) => w.id !== deleteTarget.id);
      const next = filtered[Math.min(idx, filtered.length - 1)] ?? null;
      setSelectedTab(next?.id ?? "");
    }

    setDeleteOpen(false);
    setIsDeleting(false);
  }

  async function handleDuplicateWeek(sourceWeek: Week) {
    setDuplicating(sourceWeek.id);
    const newWeek = await duplicateWeek(sourceWeek);
    if (newWeek) {
      setSelectedTab(newWeek.id);
    }
    setDuplicating(null);
  }

  const backButton = onBack ? (
    <button
      type="button"
      onClick={onBack}
      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 md:hidden"
    >
      <ArrowLeft size={14} />
      {block.name}
    </button>
  ) : null;

  if (loading) {
    return (
      <div className="p-6">
        {backButton}
        <div className="flex h-full items-center justify-center">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (weeks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        {backButton}
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
          <Calendar size={16} className="text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mb-3">No weeks in this block yet</p>
        <Button size="sm" onClick={handleCreateWeek} disabled={creatingWeek}>
          {creatingWeek ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Create Week
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6">
      {backButton}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex flex-col flex-1 min-h-0">
        <div className="sticky top-0 z-10 bg-card flex items-center gap-2 overflow-x-auto overflow-y-hidden">
          <TabsList variant="line" className="flex-nowrap">
            {weeks.map((week) => (
              <div key={week.id} className="group relative flex items-center">
                <TabsTrigger value={week.id}>Week {week.week_number}</TabsTrigger>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
                      {duplicating === week.id ? <Loader2 size={12} className="animate-spin" /> : <MoreHorizontal size={12} />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handleDuplicateWeek(week)} disabled={duplicating !== null}>
                      <Copy size={14} />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDeleteWeek(week)} className="text-destructive focus:text-destructive">
                      <Trash2 size={14} />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </TabsList>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCreateWeek} disabled={creatingWeek}>
            {creatingWeek ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {weeks.map((week) => (
            <TabsContent key={week.id} value={week.id}>
              <WeekContent weekId={week.id} />
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* Delete Week Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Week</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">Week {deleteTarget?.week_number}</span>? This will remove all days
              and data within this week. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-destructive text-sm">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteWeek} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
