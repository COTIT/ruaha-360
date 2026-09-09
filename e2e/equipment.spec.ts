import { expect, test, type Page } from '@playwright/test'

/**
 * Specs 6.3, 6.4 and 6.5 — the catalogue, the request form and the list.
 *
 * 6.4's acceptance criterion: "changing hours from 6 to 8 visibly changes the
 * estimate before submit, and the stored energy_estimate row after submit
 * matches."
 *
 * Requests are marked through `purpose` so cleanup can remove them: the suite
 * submits as the SEEDED farmer Neema, and a request left behind would shift
 * the Tower's prospective demand permanently.
 */
const PASSWORD = 'demo1234'
const FARM = /\/farm$/

// MILL-500: 15 kW, typical 6 h/day, 5 days/week, 22,000,000 TZS.
const MILL = '51000000-0000-4000-8000-000000000001'

async function signInAsNeema(page: Page) {
  await page.goto('/login')
  await page.getByTestId('login-email').fill('neema@demo.ruaha360.test')
  await page.getByTestId('login-password').fill(PASSWORD)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(FARM)
}

test.describe('/farm/equipment', () => {
  test('lists the catalogue with power, category and price', async ({ page }) => {
    await signInAsNeema(page)
    await page.goto('/farm/equipment')

    await expect(page.getByTestId('equipment-list')).toBeVisible()
    // Five items are seeded for this project.
    await expect(page.getByTestId('equipment-card')).toHaveCount(5)

    const mill = page.getByTestId(`equipment-card-${MILL}`)
    await expect(mill).toContainText('15.000 kW')
    await expect(mill).toContainText('TZS 22,000,000.00')
  })

  // "The word indicative appears next to every price. It is not a quotation."
  test('every price is labelled indicative', async ({ page }) => {
    await signInAsNeema(page)
    await page.goto('/farm/equipment')

    await expect(page.getByTestId('equipment-list')).toBeVisible()
    const prices = page.getByTestId('equipment-price')
    const count = await prices.count()
    expect(count).toBe(5)
    for (let i = 0; i < count; i += 1) {
      await expect(prices.nth(i)).toContainText(/indicative/i)
    }
  })

  test('names come from the database in the active language', async ({ page }) => {
    await signInAsNeema(page)
    await page.goto('/farm/equipment')

    // Neema's locale is 'sw'.
    await expect(page.getByTestId(`equipment-card-${MILL}`)).toContainText(
      'Mashine ya kusaga mahindi 500 kg/saa',
    )
  })
})

test.describe('/farm/equipment/$equipmentId', () => {
  test('prefills the assumptions from the equipment typicals', async ({ page }) => {
    await signInAsNeema(page)
    await page.goto(`/farm/equipment/${MILL}`)

    await expect(page.getByTestId('request-quantity')).toHaveValue('1')
    await expect(page.getByTestId('request-hours')).toHaveValue('6')
    await expect(page.getByTestId('request-days')).toHaveValue('5')
  })

  // The acceptance criterion, first half.
  test('changing hours from 6 to 8 visibly changes the estimate', async ({ page }) => {
    await signInAsNeema(page)
    await page.goto(`/farm/equipment/${MILL}`)

    await expect(page.getByTestId('estimate-kwh-day')).toHaveText('90.000 kWh')
    await expect(page.getByTestId('estimate-kwh-week')).toHaveText('450.000 kWh')

    await page.getByTestId('request-hours').fill('8')

    await expect(page.getByTestId('estimate-kwh-day')).toHaveText('120.000 kWh')
    await expect(page.getByTestId('estimate-kwh-week')).toHaveText('600.000 kWh')
    // Peak power is not a function of hours.
    await expect(page.getByTestId('estimate-power')).toHaveText('15.000 kW')
  })

  test('quantity changes the peak, not just the energy', async ({ page }) => {
    await signInAsNeema(page)
    await page.goto(`/farm/equipment/${MILL}`)

    await page.getByTestId('request-quantity').fill('2')
    await expect(page.getByTestId('estimate-power')).toHaveText('30.000 kW')
  })

  test('the panel is labelled an estimate', async ({ page }) => {
    await signInAsNeema(page)
    await page.goto(`/farm/equipment/${MILL}`)
    await expect(page.getByTestId('estimate-panel')).toContainText(/estimate, not a measurement/i)
  })

  // The acceptance criterion, second half: the stored row matches the preview.
  test('submitting stores a request whose estimate matches what was shown', async ({ page }) => {
    await signInAsNeema(page)
    await page.goto(`/farm/equipment/${MILL}`)

    await page.getByTestId('request-hours').fill('8')
    await page.getByTestId('request-purpose').fill('E2E-mill-request')

    const shownDay = await page.getByTestId('estimate-kwh-day').textContent()
    const shownWeek = await page.getByTestId('estimate-kwh-week').textContent()
    const shownPeak = await page.getByTestId('estimate-power').textContent()

    await page.getByTestId('request-submit').click()
    await expect(page.getByTestId('request-success')).toBeVisible()

    // Follow through to the request detail, which reads the STORED estimate
    // written by the trigger — not the preview.
    await page.getByTestId('request-view').click()
    await expect(page.getByTestId('request-detail')).toBeVisible()

    await expect(page.getByTestId('stored-estimate-kwh-day')).toHaveText(shownDay!.trim())
    await expect(page.getByTestId('stored-estimate-kwh-week')).toHaveText(shownWeek!.trim())
    await expect(page.getByTestId('stored-estimate-power')).toHaveText(shownPeak!.trim())
  })

  test('a submitted request is not editable', async ({ page }) => {
    await signInAsNeema(page)
    await page.goto(`/farm/equipment/${MILL}`)
    await page.getByTestId('request-purpose').fill('E2E-frozen-request')
    await page.getByTestId('request-submit').click()
    await expect(page.getByTestId('request-success')).toBeVisible()

    await page.getByTestId('request-view').click()
    await expect(page.getByTestId('request-detail')).toBeVisible()

    // The trigger freezes content once a request leaves draft; the UI must not
    // offer the control.
    await expect(page.getByTestId('request-edit')).toHaveCount(0)
    await expect(page.getByTestId('request-detail')).toContainText(/cannot be changed/i)
  })
})

test.describe('/farm/requests', () => {
  test('lists the farmer own requests with a status pill', async ({ page }) => {
    await signInAsNeema(page)
    await page.goto('/farm/requests')

    await expect(page.getByTestId('requests-list')).toBeVisible()
    // Neema is seeded with an approved mill request and a cold-room draft.
    const pills = page.getByTestId('status-pill')
    expect(await pills.count()).toBeGreaterThanOrEqual(2)
    await expect(page.getByTestId('requests-list')).toContainText('Approved')
  })

  test('shows only this farmer requests', async ({ page }) => {
    await signInAsNeema(page)
    await page.goto('/farm/requests')

    await expect(page.getByTestId('requests-list')).toBeVisible()
    // Joseph's irrigation request must not be here.
    await expect(page.getByTestId('requests-list')).not.toContainText(
      'Umwagiliaji wa kipande cha mto',
    )
  })
})
