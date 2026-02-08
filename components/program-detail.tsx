"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";
import { BlockSidebar } from "@/components/block-sidebar";
import { BlockDetail } from "@/components/block-detail";
import { InlineEdit } from "@/components/inline-edit";
import type { Program, Block } from "@/lib/types/database";

interface ProgramDetailProps {
  program: Program;
  initialBlocks: Block[];
}

export function ProgramDetail({ program, initialBlocks }: ProgramDetailProps) {
  const [programName, setProgramName] = useState(program.name);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;

  function handleBlockCreated(block: Block) {
    setBlocks((prev) => [...prev, block]);
    setSelectedBlockId(block.id);
  }

  function handleBlockUpdated(updated: Block) {
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }

  function handleBlockDeleted(blockId: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  }

  async function handleProgramRename(newName: string) {
    const supabase = createClient();
    const tables = createTables(supabase);
    const { error } = await tables.programs.update(program.id, {
      name: newName,
    });
    if (error) {
      throw new Error(error);
    }
    setProgramName(newName);
  }

  return (
    <div className="flex flex-col gap-6 min-h-0 flex-1">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/programs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
          <ArrowLeft size={14} />
          Programs
        </Link>
        <InlineEdit value={programName} onSave={handleProgramRename} className="text-2xl font-semibold tracking-tight" />
      </div>

      <div className="flex min-h-0 flex-1 rounded-lg border bg-card">
        <div
          className={cn(
            "md:w-56 md:shrink-0 md:border-r",
            selectedBlockId ? "hidden md:block" : "w-full"
          )}
        >
          <BlockSidebar
            programId={program.id}
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onSelect={setSelectedBlockId}
            onBlockCreated={handleBlockCreated}
            onBlockUpdated={handleBlockUpdated}
            onBlockDeleted={handleBlockDeleted}
          />
        </div>
        <div
          className={cn(
            "flex-1",
            selectedBlockId ? "w-full" : "hidden md:block"
          )}
        >
          {selectedBlock ? (
            <BlockDetail
              block={selectedBlock}
              onBack={() => setSelectedBlockId(null)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Layers size={16} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">{blocks.length > 0 ? "Select a block to view details" : "Create a block to get started"}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
