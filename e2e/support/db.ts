import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../..')

function loadEnvFile(): Record<string, string> {
  const path = resolve(repoRoot, '.env')
  if (!existsSync(path)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
  }
  return out
}

/**
 * Deletes the records the browser suite created.
 *
 * Runs as `postgres`, which bypasses RLS: the schema has no DELETE policies by
 * design, so this cannot be done through the app's own client. Only rows
 * carrying the E2E- marker are matched, so seeded demo data is untouchable
 * from here.
 *
 * Skips quietly when the connection details are absent — the suite must remain
 * runnable by someone who has not configured a database.
 */
export function cleanupE2eRecords(): { ran: boolean; reason?: string } {
  const env = { ...loadEnvFile(), ...process.env }
  const host = env.SUPABASE_DB_HOST
  const port = env.SUPABASE_DB_PORT ?? '5432'
  const user = env.SUPABASE_DB_USER
  const password = env.SUPABASE_DB_PASSWORD

  if (!host || !user || !password) {
    return { ran: false, reason: 'no SUPABASE_DB_* connection details' }
  }

  try {
    execFileSync(
      'psql',
      [
        `host=${host} port=${port} dbname=postgres user=${user} sslmode=require`,
        '-v',
        'ON_ERROR_STOP=1',
        '-q',
        '-f',
        resolve(here, 'cleanup.sql'),
      ],
      { env: { ...process.env, PGPASSWORD: password, PGCONNECT_TIMEOUT: '20' }, stdio: 'pipe' },
    )
    return { ran: true }
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    return { ran: false, reason: detail }
  }
}
