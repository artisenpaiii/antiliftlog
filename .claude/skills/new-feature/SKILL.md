---
name: new-feature
description: Guide for adding a new feature to LiftLog — covers database, types, components, pages, and wiring
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash
argument-hint: [feature-description]
---

# Adding a New Feature to LiftLog

Feature to implement: $ARGUMENTS

## Checklist

Follow these steps in order when adding a new feature:

### 1. Database (if needed)
- Create the table in Supabase with appropriate columns and RLS policies
- Add row interface to `lib/types/database.ts`
- Create table class in `lib/db/<table-name>-table.ts` extending `BaseTable<T>`
- Register in `lib/db/index.ts` factory

### 2. Types
- Add all interfaces/types to `lib/types/database.ts` (or a new file under `lib/types/`)
- Use `Insert<T>` and `Update<T>` utility types for mutations
- Use `interface` for object shapes, `type` for unions

### 3. Server Page
- Create page at `app/dashboard/<feature>/page.tsx` as a Server Component
- Fetch data using `await createClient()` from `@/lib/supabase/server`
- Use `createTables(supabase)` for database queries
- Pass data as props to a client component

### 4. Client Components
- Create in `components/` with `"use client"` directive
- Name files in kebab-case, components in PascalCase
- Define props with `interface {ComponentName}Props`
- Use the browser Supabase client for mutations: `createClient()` from `@/lib/supabase/client`
- Handle loading and error states

### 5. Navigation
- Add nav link in `components/nav-links.tsx` (both sidebar and bottom-tab variants)
- Use a Lucide icon for the nav item

### 6. Styling
- Use Tailwind utility classes and CSS variable tokens
- Use `cn()` for conditional classes
- Use existing shadcn/ui components before building custom ones
- Follow mobile-first responsive design
- Match existing spacing and typography patterns

## File Naming
- Pages: `app/dashboard/<feature>/page.tsx`
- Components: `components/<feature-name>.tsx`
- Types: `lib/types/<domain>.ts`
- DB tables: `lib/db/<table-name>-table.ts`
- Utilities: `lib/<utility-name>.ts`

## Patterns to Follow
- Server Component fetches data → passes to Client Component
- Client Component handles UI state and Supabase mutations
- Sidebar + Detail layout for list/detail views
- Dialog components for create/edit/delete confirmations
- Auto-save inputs for inline editing
- Empty states with icon + CTA message
