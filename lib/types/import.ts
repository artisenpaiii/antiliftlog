export type ImportRow = string[] | { separator: string };

export interface ImportDayData {
  name?: string;
  week_day_index?: number | null;
  columns: string[];
  rows: ImportRow[];
}

export interface ImportWeekData {
  days: ImportDayData[];
}

export interface ImportBlockData {
  name: string;
  start_date?: string;
  weeks: ImportWeekData[];
}
