---
name: tools
description: Work with the tools hub — RPE calculator, weight estimation, and utility features
allowed-tools: Read, Grep, Glob
---

# Tools

## Key Files

### Pages
- `app/dashboard/tools/page.tsx` — Server component. Renders `ToolsPage`.

### Components
- `components/tools-page.tsx` — Client component. Tools hub that currently contains the RPE Calculator.
- `components/rpe-calculator.tsx` — Client component. Full RPE calculator:
  - 1RM inputs for squat, bench, deadlift (persisted to user metadata)
  - Rep count selector and RPE selector
  - Main result display with calculated working weight
  - Nearby RPE table showing adjacent rep/RPE combinations
  - Unit toggle (kg/lb) with customizable weight increments

### Utilities
- `lib/rpe-chart.ts` — RPE calculation logic:
  - Mike Tuchscherer RPE chart data (20 rows, extrapolated for higher reps)
  - `getPercentage(reps, rpe)` — Returns percentage of 1RM
  - `calculateWeight(oneRM, reps, rpe)` — Returns working weight
  - `roundToNearest(value, increment)` — Rounds to nearest plate increment
  - `getNearbyEntries(reps, rpe)` — Returns surrounding RPE/rep combinations

### Types
- `lib/types/rpe.ts`:
  - `ExerciseOption`: `{ label: string, value: string }`
  - `NearbyEntry`: `{ reps: number, rpe: number, percentage: number, weight: number }`

## RPE Calculator Features
- Supports kg and lb with different rounding increments (2.5kg default, 5lb default).
- 1RM values are persisted to user metadata (`pb_squat_gym`, etc.) so they survive sessions.
- Nearby table shows a grid of weights for +/- 1 rep and +/- 0.5 RPE from the selected values.
- The RPE chart covers reps 1-20 and RPE 6-10 in 0.5 increments.

## Adding New Tools
To add a new tool to the tools hub:
1. Create a new component in `components/` (e.g., `plate-calculator.tsx`)
2. Add it to `components/tools-page.tsx` as a new tab or section
3. If it needs utility logic, add it to `lib/` (e.g., `lib/plate-math.ts`)
4. If it needs types, add to `lib/types/`
