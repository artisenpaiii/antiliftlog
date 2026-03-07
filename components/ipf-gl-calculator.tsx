"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { calculateIPFGL, getGLBenchmark } from "@/lib/ipf-gl";
import type { Sex, Equipment } from "@/lib/ipf-gl";

export function IPFGLCalculator() {
  const [total, setTotal] = useState("");
  const [bodyweight, setBodyweight] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [equipment, setEquipment] = useState<Equipment>("raw");

  const result = useMemo(() => {
    const t = parseFloat(total);
    const bw = parseFloat(bodyweight);
    if (isNaN(t) || isNaN(bw) || t <= 0 || bw <= 0) return null;
    return calculateIPFGL(t, bw, sex, equipment);
  }, [total, bodyweight, sex, equipment]);

  const benchmark = result !== null ? getGLBenchmark(result) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Sex / Equipment toggles */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Sex</Label>
          <div className="flex rounded-lg bg-muted p-1 w-fit">
            {(["male", "female"] as Sex[]).map((s) => (
              <button
                key={s}
                onClick={() => setSex(s)}
                className={cn(
                  "px-3 py-1 text-sm rounded-md transition-colors capitalize",
                  sex === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Equipment</Label>
          <div className="flex rounded-lg bg-muted p-1 w-fit">
            {(["raw", "equipped"] as Equipment[]).map((e) => (
              <button
                key={e}
                onClick={() => setEquipment(e)}
                className={cn(
                  "px-3 py-1 text-sm rounded-md transition-colors capitalize",
                  equipment === e ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gl-total" className="text-xs text-muted-foreground">Total (kg)</Label>
          <Input
            id="gl-total"
            type="number"
            step="0.5"
            min="0"
            placeholder="e.g. 700"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gl-bw" className="text-xs text-muted-foreground">Bodyweight (kg)</Label>
          <Input
            id="gl-bw"
            type="number"
            step="0.1"
            min="0"
            placeholder="e.g. 93"
            value={bodyweight}
            onChange={(e) => setBodyweight(e.target.value)}
          />
        </div>
      </div>

      {/* Result */}
      {!total || !bodyweight ? (
        <p className="text-sm text-muted-foreground">Enter total and bodyweight to compute GL score.</p>
      ) : result === null ? (
        <p className="text-sm text-muted-foreground">Invalid inputs.</p>
      ) : (
        <div className="rounded-lg border border-border p-6 space-y-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">IPF GL Score</p>
            <p className="text-4xl font-semibold">{result.toFixed(2)}</p>
            {benchmark && (
              <p className={cn("text-sm font-medium", benchmark.color)}>{benchmark.label}</p>
            )}
          </div>
          <div className="border-t border-border pt-4 space-y-1 text-xs text-muted-foreground">
            <p><span className="text-foreground font-medium">85–100</span> — Competitive club level</p>
            <p><span className="text-foreground font-medium">100–120</span> — National-level competitive</p>
            <p><span className="text-foreground font-medium">120–140</span> — Elite national / top international</p>
            <p><span className="text-foreground font-medium">140+</span> — World-class</p>
          </div>
        </div>
      )}
    </div>
  );
}
