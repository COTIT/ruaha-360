import { cleanupE2eRecords } from './support/db'

/**
 * Clean slate before the suite. A previous run that crashed mid-test would
 * otherwise leave marked records behind and skew the seeded counts.
 */
export default function globalSetup() {
  const result = cleanupE2eRecords()
  if (!result.ran) {
    console.warn(`[e2e] pre-run cleanup skipped: ${result.reason}`)
  }
}
