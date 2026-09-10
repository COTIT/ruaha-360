/**
 * Prints the cloud dev connection URL for the Supabase CLI and psql.
 *
 * This project has no local Supabase and never will. `supabase link` does not
 * work here either — the access token lacks Management API privileges for the
 * ref — so every CLI command takes `--db-url`, and this is where that URL
 * comes from.
 *
 * The CLI wants a URL, not a keyword conninfo string, so the password is
 * percent-encoded. SUPABASE_DB_HOST is the SESSION-mode pooler on 5432:
 * db.<ref>.supabase.co is IPv6-only on this project, and transaction mode
 * (6543) cannot hold the transaction-local request.jwt.claims that
 * rls_test.sql sets.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvFile() {
  const path = resolve(repoRoot, '.env')
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
  }
  return out
}

const env = { ...loadEnvFile(), ...process.env }

// `--ref` prints the project reference instead. Type generation goes through
// the Management API rather than the database: `gen types --db-url` still
// shells out to Docker to run pg_meta, and this project has no Docker.
if (process.argv.includes('--ref')) {
  if (!env.SUPABASE_PROJECT_REF) {
    console.error('Missing in .env: SUPABASE_PROJECT_REF. See .env.example.')
    process.exit(1)
  }
  process.stdout.write(env.SUPABASE_PROJECT_REF)
  process.exit(0)
}

const missing = ['SUPABASE_DB_HOST', 'SUPABASE_DB_USER', 'SUPABASE_DB_PASSWORD'].filter(
  (key) => !env[key],
)

if (missing.length > 0) {
  console.error(`Missing in .env: ${missing.join(', ')}. See .env.example.`)
  process.exit(1)
}

const user = encodeURIComponent(env.SUPABASE_DB_USER)
const password = encodeURIComponent(env.SUPABASE_DB_PASSWORD)
const port = env.SUPABASE_DB_PORT ?? '5432'

process.stdout.write(
  `postgresql://${user}:${password}@${env.SUPABASE_DB_HOST}:${port}/postgres`,
)
