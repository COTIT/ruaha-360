import { expect, test, type Page } from '@playwright/test'

/**
 * Spec 4.1: "Role-aware nav. Farmer and Officer get a bottom tab bar; Ops gets
 * a sidebar." Farmer and officer surfaces are mobile-first, ops desktop-first.
 */
const PASSWORD = 'demo1234'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill(PASSWORD)
  await page.getByTestId('login-submit').click()
}

test.describe('app shell', () => {
  test('a farmer gets a bottom tab bar and no sidebar', async ({ page }) => {
    await signIn(page, 'neema@demo.ruaha360.test')
    await expect(page).toHaveURL(/\/farm$/)

    const tabs = page.getByTestId('nav-tabs')
    await expect(tabs).toBeVisible()
    await expect(page.getByTestId('nav-sidebar')).toHaveCount(0)

    await expect(tabs.getByRole('link')).toHaveText([
      'My farm',
      'Equipment',
      'Requests',
      'Opportunities',
    ])
  })

  test('an officer gets a bottom tab bar', async ({ page }) => {
    await signIn(page, 'officer.ilundo@demo.ruaha360.test')
    await expect(page).toHaveURL(/\/officer$/)

    const tabs = page.getByTestId('nav-tabs')
    await expect(tabs).toBeVisible()
    await expect(page.getByTestId('nav-sidebar')).toHaveCount(0)
    await expect(tabs.getByRole('link')).toHaveText(['Register', 'People', 'Verify'])
  })

  test('ops gets a sidebar and no tab bar, Tower included', async ({ page }) => {
    await signIn(page, 'ops@demo.ruaha360.test')
    await expect(page).toHaveURL(/\/ops$/)

    const sidebar = page.getByTestId('nav-sidebar')
    await expect(sidebar).toBeVisible()
    await expect(page.getByTestId('nav-tabs')).toHaveCount(0)

    await expect(sidebar.getByRole('link')).toHaveText([
      'Requests',
      'Demand',
      'Catalogue',
      'Buyers',
      'Villages',
      'Control Tower',
    ])
  })

  test('the nav is navigable: every ops sidebar link resolves', async ({ page }) => {
    await signIn(page, 'ops@demo.ruaha360.test')
    await expect(page).toHaveURL(/\/ops$/)

    const labels = ['Requests', 'Demand', 'Catalogue', 'Buyers', 'Villages', 'Control Tower']
    for (const label of labels) {
      await page.getByTestId('nav-sidebar').getByRole('link', { name: label }).click()
      // A route that does not resolve renders the router's error state, not a
      // heading, so asserting a heading proves the target exists.
      await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
    }
  })

  test('every farmer tab resolves', async ({ page }) => {
    await signIn(page, 'neema@demo.ruaha360.test')
    await expect(page).toHaveURL(/\/farm$/)

    for (const label of ['My farm', 'Equipment', 'Requests', 'Opportunities']) {
      await page.getByTestId('nav-tabs').getByRole('link', { name: label }).click()
      await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
    }
  })

  test('signed out there is no surface nav at all', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('login-submit')).toBeVisible()
    await expect(page.getByTestId('nav-tabs')).toHaveCount(0)
    await expect(page.getByTestId('nav-sidebar')).toHaveCount(0)
  })

  test('the demo banner is present on every surface', async ({ page }) => {
    await signIn(page, 'ops@demo.ruaha360.test')
    await expect(page.getByTestId('demo-banner')).toBeVisible()
    await page.goto('/ops/tower')
    await expect(page.getByTestId('demo-banner')).toBeVisible()
  })
})
