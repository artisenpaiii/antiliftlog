import type { GridTopology } from "./selection-engine";
import { parseCellKey } from "./selection-engine";
import type { CellMutation } from "./cell-mutation-batcher";

interface ClipboardBuffer {
  values: string[][];
  width: number;
  height: number;
}

function getBoundingBox(
  keys: Set<string>,
  topology: GridTopology,
): { minRow: number; maxRow: number; minCol: number; maxCol: number } | null {
  const { dataRowIds, colIds } = topology;
  let minRow = Infinity;
  let maxRow = -Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;

  for (const key of keys) {
    const { rowId, colId } = parseCellKey(key);
    const r = dataRowIds.indexOf(rowId);
    const c = colIds.indexOf(colId);
    if (r === -1 || c === -1) continue;
    minRow = Math.min(minRow, r);
    maxRow = Math.max(maxRow, r);
    minCol = Math.min(minCol, c);
    maxCol = Math.max(maxCol, c);
  }

  if (minRow === Infinity) return null;
  return { minRow, maxRow, minCol, maxCol };
}

export class ClipboardEngine {
  private _buffer: ClipboardBuffer | null = null;

  /**
   * Copy selected cells into internal buffer.
   * Builds a dense 2D array from the bounding box of selected keys.
   * Cells within the box but not selected get empty string.
   */
  copy(
    selectedKeys: Set<string>,
    getCellValue: (rowId: string, colId: string) => string,
    topology: GridTopology,
  ): void {
    const box = getBoundingBox(selectedKeys, topology);
    if (!box) return;

    const { dataRowIds, colIds } = topology;
    const height = box.maxRow - box.minRow + 1;
    const width = box.maxCol - box.minCol + 1;
    const values: string[][] = [];

    for (let r = 0; r < height; r++) {
      const row: string[] = [];
      for (let c = 0; c < width; c++) {
        const rowId = dataRowIds[box.minRow + r];
        const colId = colIds[box.minCol + c];
        const key = `${rowId}:${colId}`;
        if (selectedKeys.has(key)) {
          row.push(getCellValue(rowId, colId));
        } else {
          row.push("");
        }
      }
      values.push(row);
    }

    this._buffer = { values, width, height };
  }

  /**
   * Compute paste mutations using rolling modulo from the target's top-left.
   * Only cells in targetKeys receive values.
   */
  computePaste(
    targetKeys: Set<string>,
    topology: GridTopology,
  ): CellMutation[] {
    if (!this._buffer) return [];
    return this.pasteWithModulo(this._buffer, targetKeys, topology);
  }

  /**
   * Export selected cells as tab-separated text for the OS clipboard.
   */
  handleNativeCopy(
    selectedKeys: Set<string>,
    getCellValue: (rowId: string, colId: string) => string,
    topology: GridTopology,
  ): string {
    const box = getBoundingBox(selectedKeys, topology);
    if (!box) return "";

    const { dataRowIds, colIds } = topology;
    const lines: string[] = [];

    for (let r = box.minRow; r <= box.maxRow; r++) {
      const cells: string[] = [];
      for (let c = box.minCol; c <= box.maxCol; c++) {
        const rowId = dataRowIds[r];
        const colId = colIds[c];
        const key = `${rowId}:${colId}`;
        cells.push(selectedKeys.has(key) ? getCellValue(rowId, colId) : "");
      }
      lines.push(cells.join("\t"));
    }

    return lines.join("\n");
  }

  /**
   * Parse tab-separated text from OS clipboard and compute paste mutations.
   * For single-cell target, expands the pasted data from that cell.
   * For multi-cell target, uses rolling modulo.
   */
  handleNativePaste(
    text: string,
    targetKeys: Set<string>,
    topology: GridTopology,
  ): CellMutation[] {
    if (!text) return [];

    const rows = text.split("\n").map((line) => line.split("\t"));
    const height = rows.length;
    const width = Math.max(...rows.map((r) => r.length));

    // Normalize to dense rectangle
    const values = rows.map((row) => {
      while (row.length < width) row.push("");
      return row;
    });

    const buffer: ClipboardBuffer = { values, width, height };

    // If single cell selected, expand from that cell bounded by grid
    if (targetKeys.size === 1) {
      return this.pasteExpand(buffer, targetKeys, topology);
    }

    return this.pasteWithModulo(buffer, targetKeys, topology);
  }

  getBuffer(): ClipboardBuffer | null {
    return this._buffer;
  }

  /**
   * Rolling modulo paste: for each target cell, compute buffer index using modulo.
   */
  private pasteWithModulo(
    buffer: ClipboardBuffer,
    targetKeys: Set<string>,
    topology: GridTopology,
  ): CellMutation[] {
    const box = getBoundingBox(targetKeys, topology);
    if (!box) return [];

    const { dataRowIds, colIds } = topology;
    const mutations: CellMutation[] = [];

    for (const key of targetKeys) {
      const { rowId, colId } = parseCellKey(key);
      const r = dataRowIds.indexOf(rowId);
      const c = colIds.indexOf(colId);
      if (r === -1 || c === -1) continue;

      const bufR = ((r - box.minRow) % buffer.height + buffer.height) % buffer.height;
      const bufC = ((c - box.minCol) % buffer.width + buffer.width) % buffer.width;

      mutations.push({
        rowId,
        colId,
        newVal: buffer.values[bufR][bufC],
      });
    }

    return mutations;
  }

  /**
   * Expand paste: starting from the single target cell, paste the full buffer
   * bounded by grid edges.
   */
  private pasteExpand(
    buffer: ClipboardBuffer,
    targetKeys: Set<string>,
    topology: GridTopology,
  ): CellMutation[] {
    const { dataRowIds, colIds } = topology;
    const targetKey = [...targetKeys][0];
    const { rowId, colId } = parseCellKey(targetKey);
    const startRow = dataRowIds.indexOf(rowId);
    const startCol = colIds.indexOf(colId);
    if (startRow === -1 || startCol === -1) return [];

    const mutations: CellMutation[] = [];

    for (let r = 0; r < buffer.height; r++) {
      const targetRowIdx = startRow + r;
      if (targetRowIdx >= dataRowIds.length) break;

      for (let c = 0; c < buffer.width; c++) {
        const targetColIdx = startCol + c;
        if (targetColIdx >= colIds.length) break;

        mutations.push({
          rowId: dataRowIds[targetRowIdx],
          colId: colIds[targetColIdx],
          newVal: buffer.values[r][c],
        });
      }
    }

    return mutations;
  }
}
