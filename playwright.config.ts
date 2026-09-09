import { defineConfig } from '@playwright/test'

// Configured, deliberately empty. The acceptance journey is tier 7 in
// CLAUDE.md's build order and runs against local Supabase + seed. Until then
// `pnpm e2e` reports no tests found, which is the honest result.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5173', trace: 'on-first-retry' },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
