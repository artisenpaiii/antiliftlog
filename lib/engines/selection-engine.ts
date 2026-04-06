export interface CellAddress {
  rowId: string;
  colId: string;
}

export interface GridTopology {
  dataRowIds: string[];
  colIds: string[];
}

export interface SelectionSnapshot {
  anchor: CellAddress | null;
  focusedCell: CellAddress | null;
  selectedKeys: Set<string>;
}

function cellKey(rowId: string, colId: string): string {
  return `${rowId}:${colId}`;
}

function parseCellKey(key: string): CellAddress {
  const idx = key.indexOf(":");
  return { rowId: key.slice(0, idx), colId: key.slice(idx + 1) };
}

function computeRect(
  a: CellAddress,
  b: CellAddress,
  topology: GridTopology,
): Set<string> {
  const set = new Set<string>();
  const { dataRowIds, colIds } = topology;

  const r1 = dataRowIds.indexOf(a.rowId);
  const r2 = dataRowIds.indexOf(b.rowId);
  const c1 = colIds.indexOf(a.colId);
  const c2 = colIds.indexOf(b.colId);

  if (r1 === -1 || r2 === -1 || c1 === -1 || c2 === -1) return set;

  const minR = Math.min(r1, r2);
  const maxR = Math.max(r1, r2);
  const minC = Math.min(c1, c2);
  const maxC = Math.max(c1, c2);

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      set.add(cellKey(dataRowIds[r], colIds[c]));
    }
  }
  return set;
}

export class SelectionEngine {
  private _anchor: CellAddress | null = null;
  private _focusedCell: CellAddress | null = null;
  private _selectedKeys = new Set<string>();
  private _topology: GridTopology = { dataRowIds: [], colIds: [] };
  private _listeners = new Set<() => void>();
  private _version = 0;
  private _cachedSnapshot: SelectionSnapshot | null = null;

  setTopology(dataRowIds: string[], colIds: string[]): void {
    this._topology = { dataRowIds, colIds };
    const rowSet = new Set(dataRowIds);
    const colSet = new Set(colIds);
    let changed = false;

    // Prune selection to only include cells still in topology
    if (this._selectedKeys.size > 0) {
      const valid = new Set<string>();
      for (const key of this._selectedKeys) {
        const { rowId, colId } = parseCellKey(key);
        if (rowSet.has(rowId) && colSet.has(colId)) {
          valid.add(key);
        }
      }
      if (valid.size !== this._selectedKeys.size) {
        this._selectedKeys = valid;
        changed = true;
      }
    }

    // Clear anchor/focus if they reference deleted rows or columns
    if (this._anchor && (!rowSet.has(this._anchor.rowId) || !colSet.has(this._anchor.colId))) {
      this._anchor = null;
      changed = true;
    }
    if (this._focusedCell && (!rowSet.has(this._focusedCell.rowId) || !colSet.has(this._focusedCell.colId))) {
      this._focusedCell = null;
      changed = true;
    }

    if (changed) {
      this.notify();
    }
  }

  select(addr: CellAddress, opts: { shift?: boolean; ctrl?: boolean } = {}): void {
    const key = cellKey(addr.rowId, addr.colId);

    if (opts.shift && this._anchor) {
      // Shift: rect from anchor to addr, replaces selection
      this._selectedKeys = computeRect(this._anchor, addr, this._topology);
      this._focusedCell = addr;
    } else if (opts.ctrl) {
      // Ctrl: toggle cell in selection, update anchor
      if (this._selectedKeys.has(key)) {
        this._selectedKeys = new Set(this._selectedKeys);
        this._selectedKeys.delete(key);
      } else {
        this._selectedKeys = new Set(this._selectedKeys);
        this._selectedKeys.add(key);
      }
      this._anchor = addr;
      this._focusedCell = addr;
    } else {
      // Plain click: single cell
      this._selectedKeys = new Set([key]);
      this._anchor = addr;
      this._focusedCell = addr;
    }
    this.notify();
  }

  navigate(direction: "up" | "down" | "left" | "right", shift: boolean): void {
    if (!this._focusedCell) return;

    const { dataRowIds, colIds } = this._topology;
    const rowIdx = dataRowIds.indexOf(this._focusedCell.rowId);
    const colIdx = colIds.indexOf(this._focusedCell.colId);
    if (rowIdx === -1 || colIdx === -1) return;

    let newRowIdx = rowIdx;
    let newColIdx = colIdx;

    switch (direction) {
      case "up":
        newRowIdx = Math.max(0, rowIdx - 1);
        break;
      case "down":
        newRowIdx = Math.min(dataRowIds.length - 1, rowIdx + 1);
        break;
      case "left":
        if (colIdx > 0) {
          newColIdx = colIdx - 1;
        } else if (rowIdx > 0) {
          newRowIdx = rowIdx - 1;
          newColIdx = colIds.length - 1;
        }
        break;
      case "right":
        if (colIdx < colIds.length - 1) {
          newColIdx = colIdx + 1;
        } else if (rowIdx < dataRowIds.length - 1) {
          newRowIdx = rowIdx + 1;
          newColIdx = 0;
        }
        break;
    }

    const newAddr: CellAddress = {
      rowId: dataRowIds[newRowIdx],
      colId: colIds[newColIdx],
    };

    if (shift && this._anchor) {
      this._selectedKeys = computeRect(this._anchor, newAddr, this._topology);
      this._focusedCell = newAddr;
    } else {
      const key = cellKey(newAddr.rowId, newAddr.colId);
      this._selectedKeys = new Set([key]);
      this._anchor = newAddr;
      this._focusedCell = newAddr;
    }
    this.notify();
  }

  clear(): void {
    this._anchor = null;
    this._focusedCell = null;
    this._selectedKeys = new Set();
    this.notify();
  }

  isSelected(rowId: string, colId: string): boolean {
    return this._selectedKeys.has(cellKey(rowId, colId));
  }

  isFocused(rowId: string, colId: string): boolean {
    if (!this._focusedCell) return false;
    return this._focusedCell.rowId === rowId && this._focusedCell.colId === colId;
  }

  getSelectedKeys(): Set<string> {
    return this._selectedKeys;
  }

  getAnchor(): CellAddress | null {
    return this._anchor;
  }

  getFocusedCell(): CellAddress | null {
    return this._focusedCell;
  }

  getTopology(): GridTopology {
    return this._topology;
  }

  subscribe(cb: () => void): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  getSnapshot(): SelectionSnapshot {
    if (!this._cachedSnapshot) {
      this._cachedSnapshot = {
        anchor: this._anchor,
        focusedCell: this._focusedCell,
        selectedKeys: this._selectedKeys,
      };
    }
    return this._cachedSnapshot;
  }

  getVersion(): number {
    return this._version;
  }

  private notify(): void {
    this._version++;
    this._cachedSnapshot = null;
    for (const cb of this._listeners) cb();
  }
}

export { cellKey, parseCellKey };
