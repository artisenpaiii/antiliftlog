---
name: stats
description: Work with the statistics page — volume charts, fatigue charts, program stats, and stats settings
allowed-tools: Read, Grep, Glob
---

# Statistics

## Key Files

### Pages
- `app/dashboard/stats/page.tsx` — Server component. Fetches user's programs and competitions, renders `StatsPage`.

### Components
- `components/stats-page.tsx` — Client component. Top-level stats container with tabs for "Program Stats" and "Competition Stats".
- `components/stats-sidebar.tsx` — Client component. Sidebar listing programs for selection in stats view.
- `components/stats-detail.tsx` — Client component. Shows stats for the selected program: volume chart, fatigue chart, stats settings configuration.
- `components/volume-chart.tsx` — Client component. Recharts-based line/bar chart showing total volume (weight x sets x reps) over weeks/days.
- `components/fatigue-chart.tsx` — Client component. Recharts-based chart tracking fatigue/recovery metrics.
- `components/competition-stats.tsx` — Client component. Shows aggregated competition data and progression.

### Database Layer
- `lib/db/stats-settings-table.ts` — `StatsSettingsTable`. Adds `findByProgramId()` and `upsertByProgramId()`.

### Types
- `StatsSettings`: `{ id, program_id, created_by, exercise_label, sets_label, reps_label, weight_label, rpe_label, created_at, updated_at }`

## Stats Settings
Each program can have custom column label mappings for stats:
- `exercise_label` — Which grid column represents the exercise name
- `sets_label` — Which column represents sets count
- `reps_label` — Which column represents reps count
- `weight_label` — Which column represents weight
- `rpe_label` — Which column represents RPE

These let the stats engine interpret arbitrary grid columns to compute volume and fatigue.

## Chart Library
- Uses `recharts` for all chart rendering.
- Charts use the app's CSS variable colors for theming (violet primary, muted backgrounds).

## Conventions
- Stats are read-only views computed from training data.
- Program selection via sidebar on desktop, dropdown on mobile.
- Competition stats tab shows lift progression across meets.
