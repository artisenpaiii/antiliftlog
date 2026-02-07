"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  className?: string;
}

export function InlineEdit({ value, onSave, className }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  async function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setDraft(value);
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(trimmed);
    } catch {
      setDraft(value);
    }
    setSaving(false);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
  }

  if (editing || saving) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className={cn(
            "bg-transparent border-b border-border outline-none focus:border-primary transition-colors",
            className,
          )}
        />
        {saving && (
          <Loader2 size={14} className="animate-spin text-muted-foreground" />
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "text-left cursor-text hover:border-b hover:border-border transition-colors border-b border-transparent",
        className,
      )}
    >
      {value}
    </button>
  );
}
