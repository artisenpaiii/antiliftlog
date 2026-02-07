# LiftLog - Project Instructions

## Project Overview

LiftLog is a fitness training application where users create and manage their training programs, track workouts, view stats, and monitor progress. The application is built with Next.js (App Router) and Supabase as the complete backend (auth, database, storage).

## Tech Stack

| Layer        | Technology                                      |
| ------------ | ----------------------------------------------- |
| Framework    | Next.js (App Router, React 19)                  |
| Language     | TypeScript (strict mode)                        |
| Styling      | Tailwind CSS 3 with CSS variables               |
| UI Library   | shadcn/ui (new-york style) + Radix UI + Lucide  |
| Backend/DB   | Supabase (Auth, PostgreSQL, Row Level Security)  |
| Auth         | Supabase Auth via `@supabase/ssr`                |
| Theme        | Dark only (no theme switching)                   |
| Utilities    | clsx + tailwind-merge via `cn()` helper          |

## Project Structure

```
app/                    # Next.js App Router pages and layouts
  auth/                 # Authentication routes (login, sign-up, etc.)
  protected/            # Authenticated-only routes
  layout.tsx            # Root layout
  globals.css           # Tailwind base + CSS variable tokens
components/             # React components
  ui/                   # shadcn/ui primitives (Button, Card, Input, etc.)
lib/                    # Shared utilities and clients
  supabase/
    client.ts           # Browser-side Supabase client (createClient)
    server.ts           # Server-side Supabase client (async createClient)
    proxy.ts            # Middleware session refresh
  utils.ts              # cn() helper and shared utilities
proxy.ts                # Next.js middleware (session management)
```

## Supabase Client Usage

Always use the project's existing Supabase clients. Never create a new Supabase instance directly.

**Client components:**

```ts
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const { data, error } = await supabase.from("table_name").select("*");
```

**Server components / Server actions / Route handlers:**

```ts
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
const { data, error } = await supabase.from("table_name").select("*");
```

Important: The server client is async. Always `await createClient()` on the server. Never store the server client in a global variable — create a new instance per request.

## TypeScript Standards

- Strict mode is enabled. Do not use `any` — type everything explicitly.
- Use `interface` for object shapes and component props. Use `type` for unions, intersections, and utility types.
- Define database row types in a dedicated types file (e.g., `lib/types/database.ts`).
- Use path aliases: `@/components`, `@/lib`, `@/hooks`.
- Prefer `const` over `let`. Never use `var`.
- Use named exports. Default exports only for page/layout files (Next.js convention).
- Prefer early returns over deep nesting.

## Tailwind & Styling Standards

- Use Tailwind utility classes exclusively. No custom CSS unless absolutely necessary.
- Use the `cn()` helper from `@/lib/utils` to merge conditional classes:

```ts
import { cn } from "@/lib/utils";

<div className={cn("base-classes", condition && "conditional-class")} />
```

- Use CSS variable tokens for colors (e.g., `bg-background`, `text-foreground`, `text-muted-foreground`).
- The app uses a single dark theme. Use semantic color tokens, not hardcoded colors.
- Use the existing shadcn/ui components from `@/components/ui` before building custom ones.
- Add new shadcn/ui components via CLI: `npx shadcn@latest add <component>`.

## Design Guidelines

Follow a **minimalistic design with modern touch**:

- **Whitespace**: Use generous spacing. Don't crowd elements. Prefer `p-6`, `gap-4`, `space-y-4` or larger.
- **Typography**: Keep text hierarchy clear. Use `text-sm` for secondary content, default for body, `text-lg`/`text-xl` for headings. Use `font-medium` or `font-semibold` sparingly for emphasis.
- **Colors**: Primary is violet (`263 70% 58%`). Stick to the token palette: `primary` for key actions, `muted` for secondary surfaces, `accent` for violet-tinted highlights, `destructive` for danger states. Avoid introducing new colors without justification.
- **Borders & Shadows**: Use `border` with `border-border` for subtle separation. Shadows should be minimal (`shadow-sm`) or none.
- **Rounded corners**: Use `rounded-lg` or `rounded-xl` for cards and containers. Use `rounded-md` for buttons and inputs (matches `--radius` token).
- **Animations**: Keep animations subtle and purposeful. Use `tailwindcss-animate` utilities or simple transitions (`transition-colors`, `duration-150`).
- **Icons**: Use Lucide icons via `lucide-react`. Keep icons small (`size={16}` or `size={20}`). Don't overuse them.
- **Empty states**: Always design for empty states with a short message and a call-to-action.
- **Loading states**: Use skeleton placeholders or subtle spinners, not full-page loaders.
- **Mobile first**: Design for mobile first, then scale up. All layouts must be responsive.

## Component Standards

- **Client vs Server**: Default to Server Components. Only add `"use client"` when the component needs interactivity (event handlers, hooks, browser APIs).
- **Props**: Define props with an `interface` named `{ComponentName}Props`.
- **File naming**: Use kebab-case for files (`training-program-card.tsx`). Use PascalCase for component names (`TrainingProgramCard`).
- **One component per file** for primary components. Small helper components can live in the same file.
- **Composition over configuration**: Prefer composable sub-components (like shadcn/ui Card pattern) over large config objects.
- **Error handling**: Show user-friendly error messages via UI. Log details to console in development. Never expose raw error objects.

## Data Fetching Patterns

- Fetch data in Server Components using the server Supabase client.
- For client-side mutations (create, update, delete), use the client Supabase client.
- Always handle `error` from Supabase responses:

```ts
const { data, error } = await supabase.from("exercises").select("*");
if (error) {
  // handle error
}
```

- Use Supabase Row Level Security (RLS) policies to enforce access control at the database level. Never rely solely on client-side checks.

## Authentication

- Auth is handled by Supabase Auth with cookie-based sessions.
- The middleware in `proxy.ts` refreshes sessions and redirects unauthenticated users from protected routes.
- Protected pages live under `app/protected/`. The layout checks for an active session.
- Access the current user on the server:

```ts
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

## Naming Conventions

| Item              | Convention    | Example                      |
| ----------------- | ------------- | ---------------------------- |
| Files             | kebab-case    | `training-program-card.tsx`  |
| Components        | PascalCase    | `TrainingProgramCard`        |
| Functions         | camelCase     | `fetchTrainingPrograms`      |
| Constants         | UPPER_SNAKE   | `MAX_SETS_PER_EXERCISE`      |
| Types/Interfaces  | PascalCase    | `TrainingProgram`            |
| Database tables   | snake_case    | `training_programs`          |
| CSS variables     | kebab-case    | `--card-foreground`          |
| Route segments    | kebab-case    | `app/training-programs/`     |

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL         # Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  # Supabase publishable (anon) key
```

Only `NEXT_PUBLIC_` prefixed variables are available in client components. Keep secrets server-side only.

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```
