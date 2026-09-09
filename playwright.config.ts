import { defineConfig } from '@playwright/test'

// Configured, deliberately empty. The acceptance journey is tier 7 in
// CLAUDE.md's build order and runs against local Supabase + seed. Until then
// `pnpm e2e` reports no tests found, which is the honest result.
export default defineConfig({
  testDir: './e2e',
  // Serialised on purpose. The suite runs against a single shared Supabase
  // project: five workers signing in concurrently produced intermittent failed
  // reads, which surfaced as a valid officer being routed to /no-access. One
  // worker also makes the language test's write to app_user.locale safe, since
  // nothing else can be mid-read on that row.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // One retry absorbs a genuinely transient remote hiccup without hiding a
  // real regression: a test that fails twice in a row still fails.
  retries: 1,
  reporter: 'list',
  // The suite creates real records. Both hooks remove anything carrying the
  // E2E- marker, so the seeded figures rls_test.sql asserts stay intact even
  // if a run crashes mid-test.
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: { baseURL: 'http://localhost:5173', trace: 'on-first-retry' },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
