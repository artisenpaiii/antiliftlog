---
name: competitions
description: Work with competition tracking — meets, attempts, results, and the competition management UI
allowed-tools: Read, Grep, Glob
---

# Competitions

## Key Files

### Pages
- `app/dashboard/competitions/page.tsx` — Server component. Fetches user's competitions, renders `CompetitionsPage`.

### Components
- `components/competitions-page.tsx` — Client component. Top-level container with sidebar + detail view. Handles competition creation and selection.
- `components/competition-sidebar.tsx` — Client component. Lists competitions in the sidebar for selection.
- `components/competition-detail.tsx` — Client component. Shows and edits competition details: meet info, weight class, bodyweight, and the attempts table. Handles delete.
- `components/attempts-table.tsx` — Client component. Renders 3x3 grid of attempts for squat, bench, and deadlift. Each attempt has weight (kg) and good/bad toggle.

### Database Layer
- `lib/db/competition-table.ts` — `CompetitionTable`. Adds `findByUserId()` with ordering by `meet_date DESC`.

### Types
- `Competition` interface (in `lib/types/database.ts`):
  ```
  id, created_by, meet_name, meet_date, weight_class, bodyweight_kg,
  squat_1_kg, squat_1_good, squat_2_kg, squat_2_good, squat_3_kg, squat_3_good,
  bench_1_kg, bench_1_good, bench_2_kg, bench_2_good, bench_3_kg, bench_3_good,
  deadlift_1_kg, deadlift_1_good, deadlift_2_kg, deadlift_2_good, deadlift_3_kg, deadlift_3_good,
  placing_rank, notes, created_at, updated_at
  ```

## Data Model
- Each competition has 3 lifts (squat, bench, deadlift) with 3 attempts each.
- Each attempt stores the weight in kg and whether it was a good lift (boolean).
- `placing_rank` is the final placement.
- `weight_class` is a string (e.g., "93kg").
- `bodyweight_kg` is a decimal.
- Competitions are ordered by `meet_date DESC` by default.

## Conventions
- Sidebar + detail layout (same pattern as programs and stats).
- Empty state shows icon + "Add Competition" CTA.
- Attempt toggles use a visual good/bad indicator (green check / red X).
- All fields use auto-save inputs for immediate persistence.
