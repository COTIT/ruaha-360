import { createClient } from '@supabase/supabase-js'

// TODO(tier 1): once `pnpm supabase gen types typescript` has produced
// src/lib/db.types.ts, type the client:
//
//   import type { Database } from '@/lib/db.types'
//   ... createClient<Database>(url, anonKey, { ... })
//
// db.types.ts is GENERATED and never hand-edited (CLAUDE.md), which is why it
// is absent rather than stubbed: a hand-written placeholder would be a lie the
// compiler believes.

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required. Copy .env.example to .env.',
  )
}

/**
 * The only data client in the app.
 *
 * Anon key only. A service-role key bypasses RLS, and RLS is the security
 * boundary — nothing in this app may hold one.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

/** Drives the demo banner. Never a database column — see CLAUDE.md. */
export const isDemoData = import.meta.env.VITE_DATA_MODE === 'demo'
