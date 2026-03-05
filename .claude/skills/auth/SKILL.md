---
name: auth
description: Work with authentication — login, sign-up, session management, password reset, and Supabase Auth integration
allowed-tools: Read, Grep, Glob
---

# Authentication

## Key Files

### Pages & Routes
- `app/auth/login/page.tsx` — Login page (server, renders LoginForm)
- `app/auth/sign-up/page.tsx` — Sign-up page (server, renders SignUpForm)
- `app/auth/forgot-password/page.tsx` — Password reset request
- `app/auth/update-password/page.tsx` — Password update after reset
- `app/auth/sign-up-success/page.tsx` — Post-registration confirmation
- `app/auth/error/page.tsx` — Auth error handler
- `app/auth/confirm/route.ts` — Email confirmation callback (Route Handler)

### Components
- `components/login-form.tsx` — Client form: email + password sign-in via `supabase.auth.signInWithPassword()`
- `components/sign-up-form.tsx` — Client form: email, username (displayName), password, invitation code. Uses `supabase.auth.signUp()` with `user_metadata`
- `components/forgot-password-form.tsx` — Client form: sends password reset email
- `components/update-password-form.tsx` — Client form: sets new password
- `components/logout-button.tsx` — Client button: calls `supabase.auth.signOut()` then redirects

### Infrastructure
- `proxy.ts` — Next.js middleware. Refreshes sessions via `updateSession()`, redirects unauthenticated users from protected routes
- `lib/supabase/proxy.ts` — Session refresh helper used by middleware
- `lib/supabase/server.ts` — Server-side Supabase client (async, cookie-based)
- `lib/supabase/client.ts` — Browser-side Supabase client

## Conventions
- Auth forms are **cardless** — centered vertically with a Dumbbell icon header, no Card wrapper.
- Sign-up stores `displayName` and `invitation_code` in `user_metadata`.
- Protected routes live under `app/dashboard/`. The layout checks for an active session.
- Server-side user access: `const { data: { user } } = await supabase.auth.getUser();`
- Never store server Supabase client globally — create a new instance per request with `await createClient()`.

## Auth Flow
1. Unauthenticated user lands on `/` and is shown landing page
2. Navigate to `/auth/login` or `/auth/sign-up`
3. Sign-up requires invitation code (checked client-side against env var)
4. After sign-up → redirect to `/auth/sign-up-success` (email confirmation pending)
5. Email confirmation callback → `/auth/confirm`
6. Login → redirect to `/dashboard`
7. Middleware refreshes session cookies on every request
