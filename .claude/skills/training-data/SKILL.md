---
name: training-data
description: Work with training data entry — weeks, days, exercise grids (columns and rows), sleep tracking, and drag-drop reordering
allowed-tools: Read, Grep, Glob
---

# Training Data Entry

## Key Files

### Components
- `components/week-content.tsx` — Client component. Renders all days within a week. Handles day creation via `CreateDayDialog`.
- `components/day-card.tsx` — Client component. Collapsible card for a single training day. Shows day name, sleep tracking (time + quality), and the exercise grid. Handles day deletion and settings.
- `components/day-grid.tsx` — Client component. The core exercise data grid. Renders columns (headers) and rows (exercises) with `@dnd-kit` drag-drop. Handles add/delete rows, add/delete columns, cell editing, and reorder persistence.
- `components/sortable-row.tsx` — Client component. Draggable row inside the day grid using `@dnd-kit/sortable`.
- `components/sortable-column-header.tsx` — Client component. Draggable column header with delete option.
- `components/create-day-dialog.tsx` — Client component. Dialog for creating a new day (name + optional weekday index).
- `components/auto-save-input.tsx` — Client component. Input that auto-saves to database after a debounce.

### Context
- `lib/contexts/block-cache-context.tsx` — Client context provider. Caches the entire block data hierarchy (weeks, days, columns, rows) with mutation methods:
  - `addWeek`, `deleteWeek`, `duplicateWeek`
  - `deleteDay`, `updateDay`
  - `addColumn`, `deleteColumn`, `reorderColumns`
  - `addRow`, `deleteRow`, `updateRowCells`, `reorderRows`

### Database Layer
- `lib/db/week-table.ts` — `WeekTable`. Adds `findByBlockId()`.
- `lib/db/day-table.ts` — `DayTable`. Adds `findByWeekId()`.
- `lib/db/day-column-table.ts` — `DayColumnTable`. Adds `findByDayId()`.
- `lib/db/day-row-table.ts` — `DayRowTable`. Adds `findByDayId()` and `updateCells()`.

### Types
- `Week`: `{ id, block_id, week_number, created_at, updated_at }`
- `Day`: `{ id, week_id, day_number, name, sleep_time, sleep_quality, week_day_index, created_at, updated_at }`
- `DayColumn`: `{ id, day_id, label, order, created_at, updated_at }`
- `DayRow`: `{ id, day_id, order, cells (JSON: { [column_id]: string }), created_at, updated_at }`

## Data Model
- Days have a flexible grid: arbitrary columns (e.g., Exercise, Sets, Reps, Weight, RPE) and rows (one per exercise).
- `DayRow.cells` is a JSON object mapping column IDs to string values.
- Column and row order is maintained via an `order` field.
- Sleep tracking: `sleep_time` is stored as decimal hours, displayed as HH:MM. `sleep_quality` is 0-100.
- `week_day_index`: 0=Monday through 6=Sunday (optional).

## Key Patterns
- **BlockCacheProvider** wraps `BlockDetail` and provides optimistic updates for all mutations.
- **Drag-drop** uses `@dnd-kit` with `SortableContext` for both rows and columns.
- **Week duplication** copies all days, columns, and rows, remapping column IDs in cells.
- **Auto-save** inputs debounce writes to Supabase (used for cell editing and day settings).
