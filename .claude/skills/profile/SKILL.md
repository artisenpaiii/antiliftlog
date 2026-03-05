---
name: profile
description: Work with the user profile page — display name, personal bests, and user metadata
allowed-tools: Read, Grep, Glob
---

# User Profile

## Key Files

### Pages
- `app/dashboard/profile/page.tsx` — Server component. Fetches user data, renders `ProfilePage`.

### Components
- `components/profile-page.tsx` — Client component. Displays and edits user profile:
  - Display name (from `user_metadata.displayName`)
  - Email (read-only)
  - Personal bests for gym and competition (squat, bench, deadlift)
  - Program count and competition count

### Types
- `UserMetadata` (in `lib/types/database.ts`):
  ```
  display_name, pb_squat_gym, pb_bench_gym, pb_deadlift_gym,
  pb_squat_comp, pb_bench_comp, pb_deadlift_comp
  ```

## User Metadata Storage
- All profile data is stored in Supabase Auth's `user_metadata` (not a separate table).
- Updated via `supabase.auth.updateUser({ data: { ... } })`.
- Personal bests are stored in kg as numbers.
- `display_name` is the user's chosen display name (set during sign-up as `displayName`).

## Conventions
- Profile is a single-page form with auto-save inputs.
- Personal bests are split into two sections: Gym PRs and Competition PRs.
- The profile page also shows aggregate counts (total programs, total competitions).
