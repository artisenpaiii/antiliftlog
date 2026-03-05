---
name: programs
description: Work with training programs — creating, editing, deleting programs and managing blocks within them
allowed-tools: Read, Grep, Glob
---

# Training Programs

## Key Files

### Pages
- `app/dashboard/programs/page.tsx` — Server component. Fetches user's programs via `tables.programs.findMine()` and renders `ProgramList`.
- `app/dashboard/programs/[id]/page.tsx` — Server component. Fetches single program by ID and renders `ProgramDetail`.

### Components
- `components/program-list.tsx` — Client component. Displays grid of program cards with create/delete dialogs. Uses `tables.programs.create()` and `tables.programs.delete()`.
- `components/program-detail.tsx` — Client component. Shows program name (inline-editable) + `BlockSidebar` + `BlockDetail`. Manages block selection state.
- `components/inline-edit.tsx` — Client component. Inline text editing with save-on-blur for program names.
- `components/block-sidebar.tsx` — Client component. Left sidebar listing blocks for a program. Supports create, rename, delete, and reorder. Uses `tables.blocks`.
- `components/block-detail.tsx` — Client component. Shows week tabs within a selected block. Handles week creation, deletion, duplication. Wraps content in `BlockCacheProvider`.

### Database Layer
- `lib/db/program-table.ts` — `ProgramTable` extends `BaseTable<Program>`. Adds `findByUserId()` and `findMine()` (auto-gets current user).
- `lib/db/block-table.ts` — `BlockTable` extends `BaseTable<Block>`. Adds `findByProgramId()`.

### Types
- `lib/types/database.ts` — `Program` interface: `{ id, name, created_by, created_at, updated_at }`
- `lib/types/database.ts` — `Block` interface: `{ id, program_id, name, order, created_at, updated_at }`

## Data Hierarchy
```
Program → Block[] → Week[] → Day[] → (DayColumn[], DayRow[])
```

## Conventions
- Programs are user-scoped via RLS (`created_by = auth.uid()`).
- Blocks have an `order` field for sorting within a program.
- Program names use `InlineEdit` component for in-place renaming.
- Empty state shows a card with icon and "Create Program" CTA.
- Block operations (create, rename, delete) use Dialog components.
