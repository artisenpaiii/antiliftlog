import type { ImportDayData, ImportWeekData, ImportBlockData, ImportRow } from "@/lib/types/import";

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

export function parseDayImport(raw: unknown): ImportDayData {
  if (!isObject(raw)) throw new Error("Expected a JSON object");

  if (!Array.isArray(raw.columns)) throw new Error('"columns" must be an array');
  if (raw.columns.length === 0) throw new Error('"columns" must have at least one item');
  for (const c of raw.columns) {
    if (typeof c !== "string") throw new Error("All column values must be strings");
  }

  if (!Array.isArray(raw.rows)) throw new Error('"rows" must be an array');
  for (let i = 0; i < raw.rows.length; i++) {
    const row = raw.rows[i];
    if (isObject(row) && typeof row.separator === "string" && row.separator.trim()) {
      continue;
    }
    if (!Array.isArray(row)) throw new Error(`Row ${i + 1} must be an array or a separator object`);
    if (row.length !== raw.columns.length) {
      throw new Error(
        `Row ${i + 1} has ${row.length} value(s) but there are ${raw.columns.length} column(s)`,
      );
    }
    for (const cell of row) {
      if (typeof cell !== "string") throw new Error(`Row ${i + 1} contains a non-string value`);
    }
  }

  const name = raw.name !== undefined ? String(raw.name) : undefined;

  let week_day_index: number | null | undefined;
  if (raw.week_day_index === null || raw.week_day_index === undefined) {
    week_day_index = null;
  } else if (typeof raw.week_day_index === "number") {
    if (!Number.isInteger(raw.week_day_index) || raw.week_day_index < 0 || raw.week_day_index > 6) {
      throw new Error('"week_day_index" must be an integer between 0 and 6');
    }
    week_day_index = raw.week_day_index;
  } else {
    throw new Error('"week_day_index" must be a number (0–6) or null');
  }

  return {
    name,
    week_day_index,
    columns: raw.columns as string[],
    rows: raw.rows as ImportRow[],
  };
}

export function parseWeekImport(raw: unknown): ImportWeekData {
  if (!isObject(raw)) throw new Error("Expected a JSON object");
  if (!Array.isArray(raw.days)) throw new Error('"days" must be an array');

  const days = raw.days.map((d, i) => {
    try {
      return parseDayImport(d);
    } catch (e) {
      throw new Error(`Day ${i + 1}: ${e instanceof Error ? e.message : String(e)}`);
    }
  });

  return { days };
}

export function parseBlockImport(raw: unknown): ImportBlockData {
  if (!isObject(raw)) throw new Error("Expected a JSON object");

  if (typeof raw.name !== "string" || !raw.name.trim()) {
    throw new Error('"name" is required and must be a non-empty string');
  }

  let start_date: string | undefined;
  if (raw.start_date !== undefined && raw.start_date !== null) {
    if (typeof raw.start_date !== "string") throw new Error('"start_date" must be a string');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.start_date)) {
      throw new Error('"start_date" must be in ISO format (YYYY-MM-DD)');
    }
    start_date = raw.start_date;
  }

  if (!Array.isArray(raw.weeks)) throw new Error('"weeks" must be an array');

  const weeks = raw.weeks.map((w, i) => {
    try {
      return parseWeekImport(w);
    } catch (e) {
      throw new Error(`Week ${i + 1}: ${e instanceof Error ? e.message : String(e)}`);
    }
  });

  return {
    name: raw.name.trim(),
    start_date,
    weeks,
  };
}
