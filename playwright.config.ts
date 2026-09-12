import { defineConfig } from '@playwright/test'

// The browser suite, run against the demo Supabase project and its seed.
// `journey.spec.ts` is CLAUDE.md's acceptance journey end to end; every other
// spec covers one screen and its state cycle.
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
  // 5s is the default and it is tight for the FIRST test of a run: Vite serves
  // index.html immediately and compiles the module graph on the first request,
  // so that one sign-in pays for the whole app's first build on top of a round
  // trip to a remote database. It showed up as the first spec alphabetically
  // failing `toHaveURL` while still on /login, and passing on retry. This only
  // changes how long a failing assertion waits, not what passes.
  expect: { timeout: 10_000 },
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
