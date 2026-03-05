---
name: db-layer
description: Work with the database access layer — table classes, CRUD operations, and Supabase query patterns
allowed-tools: Read, Grep, Glob
---

# Database Access Layer

## Key Files

### Table Classes
- `lib/db/base-table.ts` — Abstract `BaseTable<T>` with generic CRUD:
  - `findAll()` — Select all rows
  - `findById(id)` — Select single row by ID
  - `create(data)` — Insert single row
  - `createMany(data[])` — Insert multiple rows
  - `update(id, data)` — Update row by ID
  - `delete(id)` — Delete row by ID
- `lib/db/program-table.ts` — `ProgramTable`. Adds `findByUserId()`, `findMine()`
- `lib/db/block-table.ts` — `BlockTable`. Adds `findByProgramId()`
- `lib/db/week-table.ts` — `WeekTable`. Adds `findByBlockId()`
- `lib/db/day-table.ts` — `DayTable`. Adds `findByWeekId()`
- `lib/db/day-column-table.ts` — `DayColumnTable`. Adds `findByDayId()`
- `lib/db/day-row-table.ts` — `DayRowTable`. Adds `findByDayId()`, `updateCells()`
- `lib/db/competition-table.ts` — `CompetitionTable`. Adds `findByUserId()`
- `lib/db/stats-settings-table.ts` — `StatsSettingsTable`. Adds `findByProgramId()`, `upsertByProgramId()`

### Factory
- `lib/db/index.ts` — Exports `createTables(supabase)` factory that returns an object with all table instances. Also re-exports individual table classes.

### Types
- `lib/types/database.ts` — All row interfaces + `Insert<T>` and `Update<T>` utility types (Omit id/timestamps for inserts, Partial for updates).

## Usage Pattern

**Server-side:**
```ts
import { createClient } from "@/lib/supabase/server";
import { createTables } from "@/lib/db";

const supabase = await createClient();
const tables = createTables(supabase);
const { data, error } = await tables.programs.findMine();
```

**Client-side:**
```ts
import { createClient } from "@/lib/supabase/client";
import { createTables } from "@/lib/db";

const supabase = createClient();
const tables = createTables(supabase);
const { data, error } = await tables.days.findByWeekId(weekId);
```

## Adding a New Table
1. Create `lib/db/<table-name>-table.ts` extending `BaseTable<YourType>`
2. Add the row interface to `lib/types/database.ts`
3. Register in `lib/db/index.ts` factory function
4. Ensure RLS policies exist in Supabase for the new table

## Database Hierarchy
```
programs (user-scoped)
  └── blocks (program-scoped, ordered)
        └── weeks (block-scoped, numbered)
              └── days (week-scoped, ordered)
                    ├── day_columns (day-scoped, ordered)
                    └── day_rows (day-scoped, ordered, cells JSON)

competition (user-scoped, date-ordered)
stats_settings (program-scoped)
```

## Conventions
- All tables use UUID primary keys.
- All tables have `created_at` and `updated_at` timestamps.
- User-scoped tables have `created_by` referencing `auth.uid()`.
- RLS enforces that users can only access their own data.
- Always handle `{ data, error }` responses from Supabase.
