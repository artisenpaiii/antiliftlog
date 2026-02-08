"use client";

import { Check, X, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const LIFTS = ["squat", "bench", "deadlift"] as const;
const ATTEMPTS = [1, 2, 3] as const;

type Lift = (typeof LIFTS)[number];
type Attempt = (typeof ATTEMPTS)[number];

type AttemptKgKey = `${Lift}_${Attempt}_kg`;
type AttemptGoodKey = `${Lift}_${Attempt}_good`;

export type AttemptDraft = {
  [K in AttemptKgKey]: string;
} & {
  [K in AttemptGoodKey]: boolean | null;
};

interface AttemptsTableProps {
  draft: AttemptDraft;
  onDraftChange: (field: string, value: string | boolean | null) => void;
}

function GoodBadToggle({ value, onChange }: { value: boolean | null; onChange: (value: boolean | null) => void }) {
  function cycle() {
    if (value === null) onChange(true);
    else if (value === true) onChange(false);
    else onChange(null);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className={cn(
        "h-8 w-8 rounded-md border flex items-center justify-center transition-colors",
        value === true && "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
        value === false && "bg-red-500/20 border-red-500/50 text-red-400",
        value === null && "bg-muted border-border text-muted-foreground",
      )}
    >
      {value === true && <Check size={14} />}
      {value === false && <X size={14} />}
      {value === null && <Minus size={14} />}
    </button>
  );
}

export function AttemptsTable({ draft, onDraftChange }: AttemptsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left font-medium py-2 pr-4 w-20" />
            {LIFTS.map((lift) => (
              <th key={lift} className="text-center font-medium py-2 px-2 capitalize" colSpan={2}>
                {lift}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ATTEMPTS.map((attempt) => (
            <tr key={attempt}>
              <td className="py-1.5 pr-4 text-muted-foreground font-medium min-w-24">Attempt {attempt}</td>
              {LIFTS.map((lift) => {
                const kgKey: AttemptKgKey = `${lift}_${attempt}_kg`;
                const goodKey: AttemptGoodKey = `${lift}_${attempt}_good`;
                return (
                  <td key={lift} className="py-1.5 px-1" colSpan={2}>
                    <div className="flex items-center gap-1.5 justify-center">
                      <Input
                        type="number"
                        step="0.5"
                        value={draft[kgKey]}
                        onChange={(e) => onDraftChange(kgKey, e.target.value)}
                        placeholder="kg"
                        className="w-20 h-8 text-sm"
                      />
                      <GoodBadToggle value={draft[goodKey]} onChange={(val) => onDraftChange(goodKey, val)} />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
