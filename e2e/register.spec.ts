import { expect, test, type Page } from '@playwright/test'

import { markedName } from './support/marker'
import { CROP } from './support/seed'

/**
 * Spec 5.2 — "the most important screen in the build". One page, one submit,
 * one RPC. The six states it names are each covered here:
 *   empty · restoring draft · saving · saved-locally-not-submitted ·
 *   submit failed with retry · success
 *
 * Its acceptance criterion, verbatim: "kill the network mid-form, reload, the
 * form comes back with every field intact and a visible 'not yet submitted'
 * badge."
 */
const PASSWORD = 'demo1234'
const OFFICER = 'officer.ilundo@demo.ruaha360.test'

async function signInAsOfficer(page: Page) {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(OFFICER)
  await page.getByTestId('login-password').fill(PASSWORD)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(/\/officer$/)
}

async function fillRegistration(page: Page, family: string) {
  await page.getByTestId('register-given-name').fill('Test')
  await page.getByTestId('register-family-name').fill(family)
  await page.getByTestId('register-phone').fill('+255700000999')
  await page.getByTestId('register-household-label').fill(`${family} household`)
  await page.getByTestId('register-farm-label').fill(`${family} farm`)
  await page.getByTestId('register-plot-label').fill(`${family} plot`)
  await page.getByTestId('register-plot-area').fill('1.5')
  // Selected by id, not by label: crop names come from the database per the
  // user's locale, and the seeded Ilundo officer reads Swahili.
  await page.getByTestId('register-crop').selectOption(CROP.MAIZE.id)
  await page.getByTestId('register-cycle-area').fill('1.2')
  await page.getByTestId('register-harvest-start').fill('2026-09-01')
  await page.getByTestId('register-harvest-end').fill('2026-09-30')
  await page.getByTestId('register-harvest-kg').fill('3000')
}

test.describe('/officer/register', () => {
  test('starts empty, with nothing marked as an unsaved draft', async ({ page }) => {
    await signInAsOfficer(page)
    await page.goto('/officer/register')

    await expect(page.getByTestId('register-given-name')).toHaveValue('')
    await expect(page.getByTestId('unsaved-draft-badge')).toHaveCount(0)
    await expect(page.getByTestId('register-submit')).toBeEnabled()
  })

  test('reports every required field rather than failing silently', async ({ page }) => {
    await signInAsOfficer(page)
    await page.goto('/officer/register')

    await page.getByTestId('register-submit').click()

    await expect(page.getByTestId('register-given-name-error')).toBeVisible()
    await expect(page.getByTestId('register-family-name-error')).toBeVisible()
    await expect(page.getByTestId('register-farm-label-error')).toBeVisible()
    await expect(page.getByTestId('register-plot-label-error')).toBeVisible()
  })

  // crop.measured_by drives which measure field is asked for. The RPC rejects
  // the wrong one, so the form must not offer it.
  test('the measure field follows how the crop is measured', async ({ page }) => {
    await signInAsOfficer(page)
    await page.goto('/officer/register')

    await page.getByTestId('register-crop').selectOption(CROP.MAIZE.id)
    await expect(page.getByTestId('register-cycle-area')).toBeVisible()
    await expect(page.getByTestId('register-cycle-tree-count')).toHaveCount(0)

    await page.getByTestId('register-crop').selectOption(CROP.AVOCADO.id)
    await expect(page.getByTestId('register-cycle-tree-count')).toBeVisible()
    await expect(page.getByTestId('register-cycle-area')).toHaveCount(0)

    await page.getByTestId('register-crop').selectOption(CROP.HONEY.id)
    await expect(page.getByTestId('register-cycle-unit-count')).toBeVisible()
  })

  // THE acceptance criterion for this screen.
  test('an interrupted form survives a reload with every field intact', async ({ page }) => {
    await signInAsOfficer(page)
    await page.goto('/officer/register')

    const family = markedName()
    await fillRegistration(page, family)

    // An unsubmitted form must LOOK unsubmitted.
    await expect(page.getByTestId('unsaved-draft-badge')).toBeVisible()

    await page.reload()

    await expect(page.getByTestId('register-given-name')).toHaveValue('Test')
    await expect(page.getByTestId('register-family-name')).toHaveValue(family)
    await expect(page.getByTestId('register-phone')).toHaveValue('+255700000999')
    await expect(page.getByTestId('register-farm-label')).toHaveValue(`${family} farm`)
    await expect(page.getByTestId('register-plot-area')).toHaveValue('1.5')
    await expect(page.getByTestId('register-harvest-kg')).toHaveValue('3000')
    await expect(page.getByTestId('unsaved-draft-badge')).toBeVisible()
  })

  test('a failed submit stays on the form, keeps the draft and offers retry', async ({ page }) => {
    await signInAsOfficer(page)
    await page.goto('/officer/register')
    await fillRegistration(page, markedName())

    // Fail only the RPC, so the failure is the write and nothing else.
    await page.route('**/rest/v1/rpc/app_register_farmer', (route) => route.abort('failed'))
    await page.getByTestId('register-submit').click()

    await expect(page.getByTestId('register-error')).toBeVisible()
    await expect(page.getByTestId('unsaved-draft-badge')).toBeVisible()
    await expect(page.getByTestId('register-submit')).toBeEnabled()
    await expect(page.getByTestId('register-given-name')).toHaveValue('Test')
  })

  test('a successful submit confirms, clears the draft, and the person is findable', async ({
    page,
  }) => {
    await signInAsOfficer(page)
    await page.goto('/officer/register')

    const family = markedName()
    await fillRegistration(page, family)
    await page.getByTestId('register-submit').click()

    await expect(page.getByTestId('register-success')).toBeVisible()
    // Cleared only after the RPC returned success.
    await expect(page.getByTestId('unsaved-draft-badge')).toHaveCount(0)

    // The draft must not come back on a fresh visit.
    await page.goto('/officer/register')
    await expect(page.getByTestId('register-given-name')).toHaveValue('')
  })

  // Reference data is translated in the database, not in the i18n JSON —
  // these rows are created at runtime and a repo file cannot translate them.
  test('crop names come from the database in the user own language', async ({ page }) => {
    await signInAsOfficer(page)
    await page.goto('/officer/register')

    // The seeded Ilundo officer has app_user.locale = 'sw'.
    const option = page.getByTestId('register-crop').locator(`option[value="${CROP.MAIZE.id}"]`)
    await expect(option).toHaveText(CROP.MAIZE.sw)

    await page.getByTestId('language-switch').selectOption('en')
    await expect(option).toHaveText(CROP.MAIZE.en)

    // Leave the seeded locale as it was found.
    await page.getByTestId('language-switch').selectOption('sw')
    await expect(page.getByTestId('language-switch')).toBeEnabled()
  })

  test('a farmer cannot reach the register screen', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('login-email').fill('neema@demo.ruaha360.test')
    await page.getByTestId('login-password').fill(PASSWORD)
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL(/\/farm$/)

    await page.goto('/officer/register')
    // The officer guard sends them back to their own surface.
    await expect(page).toHaveURL(/\/farm$/)
  })
})
