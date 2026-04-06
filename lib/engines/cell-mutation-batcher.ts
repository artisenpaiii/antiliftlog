export interface CellMutation {
  rowId: string;
  colId: string;
  newVal: string;
}

export interface CellSaveResult {
  rowId: string;
  colId: string;
  success: boolean;
}

export type CellSaveState = "idle" | "saving" | "saved" | "error";

interface BatcherOptions {
  bulkSaveFn: (updates: { rowId: string; cells: Record<string, string> }[]) => Promise<boolean>;
  getCurrentCells: (rowId: string) => Record<string, string>;
  onStateChange: (states: Map<string, CellSaveState>) => void;
  debounceMs?: number;
}

function cellKey(rowId: string, colId: string): string {
  return `${rowId}:${colId}`;
}

export class CellMutationBatcher {
  private _pending = new Map<string, CellMutation>();
  private _inFlight = new Map<string, CellMutation>();
  private _cellStates = new Map<string, CellSaveState>();
  private _savedTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _flushing = false;

  private readonly _bulkSaveFn: BatcherOptions["bulkSaveFn"];
  private readonly _getCurrentCells: BatcherOptions["getCurrentCells"];
  private readonly _onStateChange: BatcherOptions["onStateChange"];
  private readonly _debounceMs: number;

  constructor(opts: BatcherOptions) {
    this._bulkSaveFn = opts.bulkSaveFn;
    this._getCurrentCells = opts.getCurrentCells;
    this._onStateChange = opts.onStateChange;
    this._debounceMs = opts.debounceMs ?? 300;
  }

  /**
   * Queue mutations for batched save. Starts debounce timer.
   */
  queue(mutations: CellMutation[]): void {
    for (const m of mutations) {
      const key = cellKey(m.rowId, m.colId);
      this._pending.set(key, m);
      // Clear any previous error state
      if (this._cellStates.get(key) === "error") {
        this._cellStates.delete(key);
      }
    }

    // Reset debounce
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = setTimeout(() => {
      this.flush();
    }, this._debounceMs);
  }

  /**
   * Immediately flush pending mutations.
   */
  async flush(): Promise<CellSaveResult[]> {
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }

    if (this._pending.size === 0) return [];

    // Move pending to inFlight
    this._inFlight = new Map(this._pending);
    this._pending.clear();

    // Group mutations by rowId
    const byRow = new Map<string, CellMutation[]>();
    for (const m of this._inFlight.values()) {
      const list = byRow.get(m.rowId) ?? [];
      list.push(m);
      byRow.set(m.rowId, list);
    }

    // Build row updates by merging mutations into current cells
    const updates: { rowId: string; cells: Record<string, string> }[] = [];
    for (const [rowId, mutations] of byRow) {
      const current = { ...this._getCurrentCells(rowId) };
      for (const m of mutations) {
        if (m.newVal === "") {
          delete current[m.colId];
        } else {
          current[m.colId] = m.newVal;
        }
      }
      updates.push({ rowId, cells: current });
    }

    // Mark all cells as saving
    for (const key of this._inFlight.keys()) {
      this._cellStates.set(key, "saving");
    }
    this._notifyStates();

    this._flushing = true;
    const success = await this._bulkSaveFn(updates);
    this._flushing = false;

    const results: CellSaveResult[] = [];

    for (const [key, mutation] of this._inFlight) {
      if (success) {
        this._cellStates.set(key, "saved");
        // Auto-clear saved state after 1.5s
        const existingTimer = this._savedTimers.get(key);
        if (existingTimer) clearTimeout(existingTimer);
        this._savedTimers.set(
          key,
          setTimeout(() => {
            this._cellStates.delete(key);
            this._savedTimers.delete(key);
            this._notifyStates();
          }, 1500),
        );
      } else {
        this._cellStates.set(key, "error");
      }
      results.push({
        rowId: mutation.rowId,
        colId: mutation.colId,
        success,
      });
    }

    this._inFlight.clear();
    this._notifyStates();

    // If new mutations arrived during flush, flush again
    if (this._pending.size > 0) {
      return [...results, ...(await this.flush())];
    }

    return results;
  }

  getCellStates(): Map<string, CellSaveState> {
    return new Map(this._cellStates);
  }

  isFlushing(): boolean {
    return this._flushing;
  }

  destroy(): void {
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
    }
    for (const timer of this._savedTimers.values()) {
      clearTimeout(timer);
    }
    this._savedTimers.clear();
  }

  private _notifyStates(): void {
    this._onStateChange(new Map(this._cellStates));
  }
}
