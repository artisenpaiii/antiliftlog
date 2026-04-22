import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

// Realtime-only client: passes the JWT as the WebSocket ?apikey so the
// server opens the connection as the authenticated user instead of anon.
// Supabase evaluates postgres_changes RLS at the connection level, so the
// anon key in the default client means all events are filtered out.
export function createRealtimeClient(accessToken: string) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { apikey: accessToken } },
    },
  );
}
