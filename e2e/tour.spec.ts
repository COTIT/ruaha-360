import { expect, test, type Page } from '@playwright/test'

/**
 * The guided tour, from the only angle that proves anything: a real first
 * visit, in a real browser, with the spotlight actually cut.
 *
 * Every other spec starts with the tours already taken (`playwright.config.ts`).
 * This one opts out — a genuinely empty storage state is what a new user has.
 */
test.use({ storageState: { cookies: [], origins: [] } })

const PASSWORD = 'demo1234'

const WHO = {
  officer: { email: 'officer.ilundo@demo.ruaha360.test', landing: /\/officer$/ },
  ops: { email: 'ops@demo.ruaha360.test', landing: /\/ops$/ },
  farmer: { email: 'neema@demo.ruaha360.test', landing: /\/farm$/ },
} as const

async function signIn(page: Page, who: keyof typeof WHO) {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(WHO[who].email)
  await page.getByTestId('login-password').fill(PASSWORD)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(WHO[who].landing)
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
    await expect(page.getByTestId('tour-tooltip')).toBeHidden()

    await page.reload()
    await expect(page.getByTestId('officer-home')).toBeVisible()
    await expect(page.getByTestId('tour-tooltip')).toBeHidden()
  })
})

test.describe('walking the tour', () => {
  test('the officer tour crosses screens and ends on the verify queue', async ({ page }) => {
    await signIn(page, 'officer')
    await expect(page.getByTestId('tour-tooltip')).toBeVisible()

    // Stop 1 is the welcome; there is nothing behind it yet.
    await expect(page.getByTestId('tour-back')).toHaveCount(0)

    // Stops 2 and 3: the second is still on /officer, the third is not.
    await page.getByTestId('tour-next').click()
    await expect(page.getByTestId('tour-progress')).toHaveText('Step 2 of 6')

    await page.getByTestId('tour-next').click()
    await expect(page).toHaveURL(/\/officer\/register/)
    await expect(page.getByTestId('tour-progress')).toHaveText('Step 3 of 6')
    await expect(page.getByTestId('register-progress')).toBeVisible()

    // And back, which has to return to the screen it came from.
    await page.getByTestId('tour-back').click()
    await expect(page).toHaveURL(/\/officer$/)
    await expect(page.getByTestId('tour-progress')).toHaveText('Step 2 of 6')

    for (const step of [3, 4, 5, 6]) {
      await page.getByTestId('tour-next').click()
      await expect(page.getByTestId('tour-progress')).toHaveText(`Step ${step} of 6`)
    }

    await expect(page).toHaveURL(/\/officer\/verify/)
    // The last stop finishes rather than promising more.
    await expect(page.getByTestId('tour-next')).toHaveText('Done')
    await expect(page.getByTestId('tour-skip')).toHaveCount(0)

    await page.getByTestId('tour-next').click()
    await expect(page.getByTestId('tour-tooltip')).toBeHidden()
  })
})

test.describe('asking for it again', () => {
  test('the header button restarts the tour from the first stop', async ({ page }) => {
    await signIn(page, 'ops')
    await page.getByTestId('tour-skip').click()
    await expect(page.getByTestId('tour-tooltip')).toBeHidden()

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
