---
name: supabase
description: Work with Supabase integration — client setup, server setup, middleware, session management, and RLS
allowed-tools: Read, Grep, Glob
---

# Supabase Integration

## Key Files

### Clients
- `lib/supabase/client.ts` — Browser-side client using `createBrowserClient` from `@supabase/ssr`. Call `createClient()` (sync) in client components.
- `lib/supabase/server.ts` — Server-side client using `createServerClient` from `@supabase/ssr`. Call `await createClient()` (async) in server components, route handlers, and server actions. Uses cookie-based session.
- `lib/supabase/proxy.ts` — `updateSession()` helper for middleware. Refreshes auth tokens and manages cookie writes.

### Middleware
- `proxy.ts` — Next.js middleware entry point. Calls `updateSession()` on every request. Matches all paths except `_next/static`, `_next/image`, and `favicon.ico`.

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key (public)

## Client Usage Rules

**Server components / Route handlers / Server actions:**
```ts
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient(); // ALWAYS await
```

**Client components:**
```ts
import { createClient } from "@/lib/supabase/client";
const supabase = createClient(); // Synchronous
```

**Critical rules:**
- Server client is **async** — always `await createClient()`.
- Never store the server client in a module-level variable — create per-request.
- Never import the server client in a `"use client"` file (and vice versa).
- Use `@supabase/ssr` package, never `@supabase/auth-helpers-nextjs` (deprecated).

## Auth Methods Used
- `supabase.auth.signInWithPassword({ email, password })`
- `supabase.auth.signUp({ email, password, options: { data: metadata } })`
- `supabase.auth.getUser()` — Get current authenticated user
- `supabase.auth.signOut()`
- `supabase.auth.updateUser({ data: { ... } })` — Update user metadata
- `supabase.auth.resetPasswordForEmail(email)`

## Session Flow
1. Middleware (`proxy.ts`) intercepts every request
2. `updateSession()` reads auth cookies, refreshes tokens if needed
3. Writes updated cookies back to the response
4. Protected routes check `supabase.auth.getUser()` — redirect if no user

## RLS (Row Level Security)
- All data tables have RLS enabled in Supabase.
- Policies use `auth.uid()` to scope data to the current user.
- Never rely on client-side checks alone — RLS is the enforcement layer.
- When creating new tables, always add appropriate RLS policies.
