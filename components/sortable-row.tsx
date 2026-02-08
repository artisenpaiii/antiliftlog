"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableRowProps {
  id: string;
  children: React.ReactNode;
  saved?: boolean;
}

export function SortableRow({ id, children, saved }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "group border-b border-border/50 transition-colors duration-300",
        saved && "bg-emerald-500/10"
      )}
    >
      <td className="w-8 px-1 py-1.5">
        {saved ? (
          <Check size={12} className="mx-auto text-emerald-500" />
        ) : (
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={12} />
          </button>
        )}
      </td>
      {children}
    </tr>
  );
}
