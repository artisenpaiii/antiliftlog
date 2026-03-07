export interface ImportDayData {
  name?: string;
  week_day_index?: number | null;
  columns: string[];
  rows: string[][];
}

export interface ImportWeekData {
  days: ImportDayData[];
}

export interface ImportBlockData {
  name: string;
  start_date?: string;
  weeks: ImportWeekData[];
}
