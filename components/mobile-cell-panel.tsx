"use client";

import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";

interface MobileCellPanelProps {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onDismiss: () => void;
}

export function MobileCellPanel({ value, onChange, onCommit, onDismiss }: MobileCellPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const readyRef = useRef(false);

  useEffect(() => {
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    // Mark ready after the opening touch event has fully propagated
    const readyTimer = setTimeout(() => {
      readyRef.current = true;
    }, 300);

    return () => {
      clearTimeout(focusTimer);
      clearTimeout(readyTimer);
    };
  }, []);

  useEffect(() => {
    function handleTouchOutside(e: TouchEvent) {
      if (!readyRef.current) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        readyRef.current = false; // Prevent double-commit if cell pointer handler also commits
        onCommitRef.current();
      }
    }
    document.addEventListener("touchstart", handleTouchOutside);
    return () => document.removeEventListener("touchstart", handleTouchOutside);
  }, []);

  return (
    <div
      ref={panelRef}
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-card px-4 pb-safe pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onTouchEnd={(e) => { e.preventDefault(); onDismiss(); }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground active:bg-muted transition-colors"
        >
          <X size={18} />
        </button>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onCommit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onDismiss();
            }
          }}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onTouchEnd={(e) => { e.preventDefault(); onCommit(); }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground active:bg-primary/80 transition-colors"
        >
          <Check size={18} />
        </button>
      </div>
    </div>
  );
}
