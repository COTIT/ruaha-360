import { expect, test, type Page } from '@playwright/test'

/**
 * The guided tour, from the only angle that proves anything: a real first
 * visit, in a real browser, with the spotlight actually cut.
 *
 * Every other spec starts with the tours already taken (`playwright.config.ts`).
 * This one opts out — a genuinely empty storage state is what a new user has.
 *
 * The claims below are shaped by what this file FAILED to claim the first time.
 * It asserted that the bubble was gone at the end, which is true of a tour that
 * finished and equally true of one that died with its overlay still up: a navy
 * sheet over the whole page, `pointer-events: auto`, swallowing every click.
 * That shipped, and came back as "the screen stays blue and I cannot click
 * anything, on desktop and mobile". So the end of a tour is now asserted by
 * what the user can DO afterwards, not by what is no longer drawn.
 */
test.use({ storageState: { cookies: [], origins: [] } })

const PASSWORD = 'demo1234'

const WHO = {
  officer: {
    email: 'officer.ilundo@demo.ruaha360.test',
    landing: /\/officer$/,
    /** Where the last stop leaves you, and a nav link that is not it. */
    lastRoute: /\/officer\/verify/,
    thenClick: 'People',
    thenAt: /\/officer\/people/,
  },
  ops: {
    email: 'ops@demo.ruaha360.test',
    landing: /\/ops$/,
    lastRoute: /\/ops\/tower/,
    thenClick: 'Buyers',
    thenAt: /\/ops\/buyers/,
  },
  farmer: {
    email: 'neema@demo.ruaha360.test',
    landing: /\/farm$/,
    lastRoute: /\/farm\/opportunities/,
    thenClick: 'Equipment',
    thenAt: /\/farm\/equipment/,
  },
} as const

type Role = keyof typeof WHO

async function signIn(page: Page, who: Role) {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(WHO[who].email)
  await page.getByTestId('login-password').fill(PASSWORD)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(WHO[who].landing)
}

/**
 * The overlay is the part that swallows clicks, so its absence is asserted
 * directly — by class, because it is the library's element and carries no
 * test id of ours.
 */
const overlay = (page: Page) => page.locator('.react-joyride__overlay')

/**
 * Six stops, one click each, asserting the number every time.
 *
 * Asserting each step in turn is the point rather than ceremony: the farmer
 * tour used to race from stop 1 to stop 5 on its own, because a route crossing
 * briefly has no target and "target not found" was wired to advance. A test
 * that only checked the end would have called that a pass.
 */
async function walkToTheEnd(page: Page, stops = 6) {
  // A stop on another screen has to wait for a route change and the read
  // behind it, and the bubble is not drawn while the library waits for its
  // target. The suite's default 10s is the same number the tour itself gives a
  // missing stop before ending — racing the two decides nothing — so the wait
  // here is deliberately longer than the tour's own patience. A stop that
  // genuinely never arrives still fails, it just fails for a legible reason.
  const wait = { timeout: 20_000 }

  for (let stop = 1; stop < stops; stop += 1) {
    await expect(page.getByTestId('tour-progress')).toHaveText(`Step ${stop} of ${stops}`, wait)
    await expect(page.getByTestId('tour-next')).toHaveText('Next')
    await page.getByTestId('tour-next').click()
  }

  await expect(page.getByTestId('tour-progress')).toHaveText(`Step ${stops} of ${stops}`, wait)
  // The last stop finishes rather than promising more.
  await expect(page.getByTestId('tour-next')).toHaveText('Done')
  await expect(page.getByTestId('tour-skip')).toHaveCount(0)
}

test.describe('the first visit', () => {
  // Every role gets one, and it opens by itself — a tour nobody knows is there
  // is not a tour.
  for (const role of ['officer', 'ops', 'farmer'] as const) {
    test(`opens a tour for a ${role} who has never seen it`, async ({ page }) => {
      await signIn(page, role)

      await expect(page.getByTestId('tour-tooltip')).toBeVisible()
      await expect(page.getByTestId('tour-progress')).toHaveText('Step 1 of 6')
      await expect(page.getByTestId('tour-tooltip')).toContainText('Welcome to Ruaha 360')
    })
  }

  test('and does not open it a second time', async ({ page }) => {
    await signIn(page, 'officer')
    await expect(page.getByTestId('tour-tooltip')).toBeVisible()
    await page.getByTestId('tour-skip').click()
    await expect(overlay(page)).toHaveCount(0)

    await page.reload()
    await expect(page.getByTestId('officer-home')).toBeVisible()
    await expect(page.getByTestId('tour-tooltip')).toHaveCount(0)
    await expect(overlay(page)).toHaveCount(0)
  })
})

/**
 * The whole tour, for every role, ending in a page the user can still use.
 *
 * All three are walked because the two that broke in the field — ops at stop
 * 4→5, farmer racing itself from stop 1 — were the two this file did not cover.
 */
for (const role of ['officer', 'ops', 'farmer'] as const) {
  test.describe(`the ${role} tour, end to end`, () => {
    test('walks every stop in order and leaves the page usable', async ({ page }) => {
      await signIn(page, role)
      await expect(page.getByTestId('tour-tooltip')).toBeVisible()

      // Nothing behind the first stop, so no Back to offer.
      await expect(page.getByTestId('tour-back')).toHaveCount(0)

      await walkToTheEnd(page)
      await expect(page).toHaveURL(WHO[role].lastRoute)

      await page.getByTestId('tour-next').click()

      // The bubble going away is not the claim. These two are.
      await expect(overlay(page)).toHaveCount(0)
      await expect(page.getByTestId('tour-tooltip')).toHaveCount(0)

      // The page responds to an ordinary click, which is what "I cannot click
      // on all the functionalities" was about.
      await page.getByRole('link', { name: WHO[role].thenClick }).click()
      await expect(page).toHaveURL(WHO[role].thenAt)
    })

    test('and having been taken, it is remembered across a reload', async ({ page }) => {
      await signIn(page, role)
      await walkToTheEnd(page)
      await page.getByTestId('tour-next').click()
      await expect(overlay(page)).toHaveCount(0)

      await page.goto('/')
      await expect(page).toHaveURL(WHO[role].landing)
      await expect(page.getByTestId('tour-tooltip')).toHaveCount(0)
      await expect(overlay(page)).toHaveCount(0)
    })
  })
}

test.describe('crossing between screens', () => {
  test('the officer tour travels, and Back travels home again', async ({ page }) => {
    await signIn(page, 'officer')
    await expect(page.getByTestId('tour-tooltip')).toBeVisible()

    // Stops 1 and 2 are on /officer; stop 3 is not.
    await page.getByTestId('tour-next').click()
    await expect(page.getByTestId('tour-progress')).toHaveText('Step 2 of 6')

    await page.getByTestId('tour-next').click()
    await expect(page).toHaveURL(/\/officer\/register/)
    await expect(page.getByTestId('tour-progress')).toHaveText('Step 3 of 6')
    await expect(page.getByTestId('register-progress')).toBeVisible()

    await page.getByTestId('tour-back').click()
    await expect(page).toHaveURL(/\/officer$/)
    await expect(page.getByTestId('tour-progress')).toHaveText('Step 2 of 6')
  })

  /**
   * A screen still loading its data must not lose the tour its place. The stop
   * that follows is only shown once its own screen is the screen we are on, so
   * a slow read delays the bubble and never skips it.
   */
  test('a slow screen delays a stop rather than skipping it', async ({ page }) => {
    await page.route('**/rest/v1/v_demand_match*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.continue()
    })

    await signIn(page, 'ops')
    await expect(page.getByTestId('tour-tooltip')).toBeVisible()

    await page.getByTestId('tour-next').click()
    await expect(page.getByTestId('tour-progress')).toHaveText('Step 2 of 6')
    await page.getByTestId('tour-next').click()

    await expect(page).toHaveURL(/\/ops\/requests/)
    await expect(page.getByTestId('tour-progress')).toHaveText('Step 3 of 6')
  })
})

test.describe('asking for it again', () => {
  test('the header button restarts the tour from the first stop', async ({ page }) => {
    await signIn(page, 'ops')
    await page.getByTestId('tour-skip').click()
    await expect(overlay(page)).toHaveCount(0)

    // From somewhere else entirely: restarting has to travel back to stop one.
    await page.goto('/ops/villages')
    await page.getByTestId('tour-restart').click()

    await expect(page).toHaveURL(/\/ops$/)
    await expect(page.getByTestId('tour-progress')).toHaveText('Step 1 of 6')
  })

  test('the button is there on every surface, and never on the login screen', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('tour-restart')).toHaveCount(0)

    await signIn(page, 'farmer')
    await expect(page.getByRole('banner').getByTestId('tour-restart')).toBeVisible()
  })
})
