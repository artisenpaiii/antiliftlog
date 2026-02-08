"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";

interface SortableColumnHeaderProps {
  id: string;
  label: string;
  onDelete?: () => void;
}

export function SortableColumnHeader({ id, label, onDelete }: SortableColumnHeaderProps) {
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
    <th
      ref={setNodeRef}
      style={style}
      className="px-2 py-2 text-left text-xs font-medium text-muted-foreground bg-card whitespace-nowrap"
    >
      <div className="flex items-center gap-1 group/col">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={12} />
        </button>
        {label}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto opacity-0 group-hover/col:opacity-100 text-muted-foreground/50 hover:text-destructive transition-opacity"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </th>
  );
}
