import { expect, test, type Page } from '@playwright/test'

import { markedName } from './support/marker'
import { CROP, VILLAGE } from './support/seed'
import { assertsSeededFigures } from './support/seeded'

/**
 * THE ACCEPTANCE JOURNEY — CLAUDE.md's definition of done, and spec §11.
 *
 * One continuous run, in order, across four roles. Each step is a
 * `test.step`, so a failure names the step of the demo script that broke:
 *
 *   1 officer registers person + household + farm + plot + cycle + harvest
 *   2 officer verifies the records
 *   3 farmer sees records with provenance
 *   4 farmer submits an equipment request; the estimate moves with the hours
 *   5 ops reviews and approves
 *   6 ops opens the maize demand and sees Ilundo coverage
 *   7 ops creates an opportunity and attaches supply
 *   8 the Tower reflects all of it, and a headline drills to that farmer
 *
 * The individual screens are covered by their own specs. This one exists to
 * prove the steps CONNECT: every figure asserted from step 6 onwards is the
 * seeded figure PLUS what the earlier steps of this same test wrote. If the
 * chain from the officer's registration to the Tower headline were broken
 * anywhere, these numbers would not move.
 *
 * Two deliberate departures from a literal reading of §11, both forced by the
 * schema rather than chosen:
 *
 *   Step 3 signs in as the SEEDED farmer Neema, not as the person step 1
 *   registered. A registered person is a `person` row; signing in needs an
 *   `auth.users` row linked through `app_user`, and creating accounts is
 *   explicitly out of scope ("Do not build … user admin"). So the farmer
 *   surface is exercised with the farmer who has an account, and the step
 *   additionally asserts that she CANNOT see the farm step 1 created — which
 *   is the stronger claim about the same policy.
 *
 *   Step 7 creates its own buyer demand rather than adding an opportunity to
 *   the seeded maize demand. That demand already carries the seeded demo
 *   opportunity, so the screen correctly offers no "create" control on it —
 *   asserted in demand.spec.ts. Step 6 still reads Ilundo coverage from the
 *   seeded demand, as §11 says.
 *
 * Everything this test writes carries the E2E- marker so cleanup removes it:
 * the registration through `family_name`, the request through `purpose`, the
 * demand through `quality_note`. Nothing seeded is verified or decided —
 * `app_verify` has no inverse and approval is terminal, so a decision on a
 * seeded record would permanently degrade the demo.
 */
const PASSWORD = 'demo1234'

// MILL-500: 15 kW rated, 6 h/day and 5 days/week typical.
const MILL = '51000000-0000-4000-8000-000000000001'
// Iringa Grain Traders, 9,000 kg of maize in September.
const MAIZE_DEMAND = 'e1000000-0000-4000-8000-000000000001'
const ILUNDO = VILLAGE.ILUNDO

/**
 * The expected harvest step 1 registers. Deliberately not a round number: it
 * appears in the attach-supply dropdown as a label, and it must be
 * unmistakably this test's row and not a seeded one (4,100 / 2,300 / 5,600).
 */
const EXPECTED_KG = '3140'

// Asserts seeded figures plus its own delta, so it starts from seeded state.
assertsSeededFigures()

async function signIn(page: Page, email: string, home: RegExp) {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill(PASSWORD)
  await page.getByTestId('login-submit').click()
  // Wait for the landing redirect: navigating before it lands races the
  // session and drops straight back to /login.
  await expect(page).toHaveURL(home)
}

async function signOut(page: Page) {
  await page.getByTestId('sign-out').click()
  await expect(page).toHaveURL(/\/login/)
}

test.describe('the acceptance journey', () => {
  // Four sign-ins, ~30 navigations and eleven writes against a remote
  // database. The per-step assertions are the real guard; this only stops the
  // whole journey being cut off by the default per-test budget.
  test.describe.configure({ timeout: 300_000 })

  test('all eight steps, in order, against seeded demo data', async ({ page }) => {
    const family = markedName()
    const farmLabel = `${family} farm`
    let personId = ''
    let requestId = ''

    await test.step('1 · officer registers a farmer in one submit', async () => {
      await signIn(page, 'officer.ilundo@demo.ruaha360.test', /\/officer$/)
      await page.goto('/officer/register')

      await page.getByTestId('register-given-name').fill('Test')
      await page.getByTestId('register-family-name').fill(family)
      await page.getByTestId('register-phone').fill('+255700000999')
      await page.getByTestId('register-household-label').fill(`${family} household`)
      await page.getByTestId('register-farm-label').fill(farmLabel)
      await page.getByTestId('register-plot-label').fill(`${family} plot`)
      await page.getByTestId('register-plot-area').fill('1.5')
      // Selected by id: crop names come from the database per the user's
      // locale, and the seeded Ilundo officer reads Swahili.
      await page.getByTestId('register-crop').selectOption(CROP.MAIZE.id)
      await page.getByTestId('register-cycle-area').fill('1.2')
      // September, so the figure lands in the same production and supply
      // window as the seeded maize the later steps read.
      await page.getByTestId('register-harvest-start').fill('2026-09-01')
      await page.getByTestId('register-harvest-end').fill('2026-09-30')
      await page.getByTestId('register-harvest-kg').fill(EXPECTED_KG)

      // CLAUDE.md's extra requirement on this step: "an interrupted save in
      // step 1 that survives a reload". Asserted here rather than only in
      // register.spec.ts, because it is part of THIS step's definition.
      await expect(page.getByTestId('unsaved-draft-badge')).toBeVisible()
      await page.reload()
      await expect(page.getByTestId('register-family-name')).toHaveValue(family)
      await expect(page.getByTestId('register-harvest-kg')).toHaveValue(EXPECTED_KG)
      await expect(page.getByTestId('unsaved-draft-badge')).toBeVisible()

      await page.getByTestId('register-submit').click()
      await expect(page.getByTestId('register-success')).toBeVisible()
      // The draft is cleared only once the RPC has returned success.
      await expect(page.getByTestId('unsaved-draft-badge')).toHaveCount(0)

      await page.getByTestId('register-view-person').click()
      await expect(page.getByTestId('person-detail')).toBeVisible()
      personId = new URL(page.url()).pathname.split('/').pop() ?? ''
      expect(personId).toMatch(/^[0-9a-f-]{36}$/)

      // One submit, six records: person, household, farm, plot, cycle,
      // expected harvest.
      await expect(page.getByTestId('provenance-badge')).toHaveCount(6)
      await expect(page.getByTestId('person-outstanding')).toContainText('6 records still need')
    })

    await test.step('2 · officer verifies the records', async () => {
      // Only records this test created: app_verify is one-way.
      for (let i = 0; i < 6; i += 1) {
        const next = page.locator('[data-verify-table]').first()
        if ((await next.count()) === 0) break
        await next.click()
        await expect(page.getByTestId('person-outstanding')).not.toContainText(
          `${6 - i} records still need`,
        )
      }

      await expect(page.getByTestId('person-outstanding')).toContainText(
        'Every record here is verified',
      )
      await expect(page.locator('[data-verification="unverified"]')).toHaveCount(0)
      await expect(page.locator('[data-verification="verified"]')).toHaveCount(6)
    })

    await test.step('3 · the farmer surface shows records with provenance', async () => {
      await signOut(page)
      await signIn(page, 'neema@demo.ruaha360.test', /\/farm$/)
      await page.goto('/farm/my-farm')

      await expect(page.getByTestId('my-farm')).toBeVisible()
      await expect(page.getByTestId('farm-card')).toHaveCount(1)
      await expect(page.getByTestId('my-farm')).toContainText('Shamba la Neema')
      // Every figure on this screen says where it came from.
      const badges = page.getByTestId('my-farm').getByTestId('provenance-badge')
      expect(await badges.count()).toBeGreaterThan(0)

      // RLS scopes the farmer to app_farms(): the farm step 1 created is not
      // hers, so it is simply not in the answer.
      await expect(page.getByTestId('my-farm')).not.toContainText(farmLabel)
    })

    await test.step('4 · the farmer submits a request and the estimate moves', async () => {
      await page.goto('/farm/equipment')
      await expect(page.getByTestId('equipment-list')).toBeVisible()
      await page.getByTestId(`equipment-card-${MILL}`).click()

      // 15 kW × 6 h = 90 kWh/day, × 5 days = 450 kWh/week.
      await expect(page.getByTestId('estimate-kwh-day')).toHaveText('90.000 kWh')
      await expect(page.getByTestId('estimate-kwh-week')).toHaveText('450.000 kWh')

      await page.getByTestId('request-hours').fill('8')

      await expect(page.getByTestId('estimate-kwh-day')).toHaveText('120.000 kWh')
      await expect(page.getByTestId('estimate-kwh-week')).toHaveText('600.000 kWh')
      // Peak power is not a function of hours.
      await expect(page.getByTestId('estimate-power')).toHaveText('15.000 kW')

      await page.getByTestId('request-purpose').fill('E2E-journey-mill')
      await page.getByTestId('request-submit').click()
      await expect(page.getByTestId('request-success')).toBeVisible()

      await page.getByTestId('request-view').click()
      await expect(page.getByTestId('request-detail')).toBeVisible()
      requestId = new URL(page.url()).pathname.split('/').pop() ?? ''
      expect(requestId).toMatch(/^[0-9a-f-]{36}$/)

      // The stored estimate is written by pue_recompute_estimate, not by the
      // client, and must agree with the preview the farmer was shown.
      await expect(page.getByTestId('stored-estimate-kwh-day')).toHaveText('120.000 kWh')
      await expect(page.getByTestId('stored-estimate-power')).toHaveText('15.000 kW')
    })

    await test.step('5 · ops reviews and approves it', async () => {
      await signOut(page)
      await signIn(page, 'ops@demo.ruaha360.test', /\/ops$/)

      await page.goto('/ops/requests?status=submitted')
      await expect(page.getByTestId('requests-table')).toBeVisible()
      await expect(page.getByTestId('requests-table')).toContainText('Neema Mwakalinga')

      // Opened by id rather than by clicking the first row. The table shows
      // applicant, equipment, estimate and status — not the purpose — so a
      // row click cannot distinguish THIS request from any other submitted
      // one, and deciding the wrong request is not recoverable.
      await page.goto(`/ops/requests/${requestId}`)
      await expect(page.getByTestId('request-review')).toBeVisible()
      await expect(page.getByTestId('request-review')).toContainText('E2E-journey-mill')

      const headroomBefore = await page.getByTestId('review-headroom').textContent()

      await page.getByTestId('action-start_review').click()
      await expect(page.getByTestId('status-pill')).toHaveAttribute('data-status', 'under_review')

      // The status machine lives in pue_request_guard; approve needs a note.
      await page.getByTestId('action-approve').click()
      await expect(page.getByTestId('decision-note-error')).toBeVisible()

      await page.getByTestId('decision-note').fill('DEMO approval. Headroom confirmed.')
      await page.getByTestId('action-approve').click()
      await expect(page.getByTestId('status-pill')).toHaveAttribute('data-status', 'approved')

      // 7.3's acceptance criterion: approving moves approved_peak_kw, so the
      // headroom on this very screen changes.
      await expect(page.getByTestId('review-headroom')).not.toHaveText(headroomBefore!.trim())
    })

    await test.step('6 · ops opens the maize demand and sees Ilundo coverage', async () => {
      await page.goto('/ops/demand')
      await expect(page.getByTestId('demand-table')).toBeVisible()
      await expect(page.getByTestId('demand-table')).toContainText('Iringa Grain Traders')

      await page.goto(`/ops/demand/${MAIZE_DEMAND}`)
      await expect(page.getByTestId('demand-detail')).toBeVisible()

      // Seeded Ilundo maize is 12,000 kg expected with 6,400 kg committed,
      // leaving 5,600 kg. Step 1 added 3,140 kg, none of it committed, so
      // available is 8,740 kg and coverage of the 9,000 kg demand is
      // round(100 × 8,740 / 9,000, 1) = 97.1%. That movement IS the link
      // between the officer's registration and the order book.
      const coverage = page.getByTestId(`coverage-${ILUNDO}`)
      await expect(coverage.getByTestId('coverage-committed')).toContainText('6,400.00 kg')
      await expect(coverage.getByTestId('coverage-available')).toContainText('8,740.00 kg')
      await expect(page.getByTestId(`match-row-${ILUNDO}`)).toContainText('97.1%')

      // An opportunity is not a sale, and the screen says so.
      await expect(page.getByTestId('demand-detail')).toContainText(/not a sale/i)
    })

    await test.step('7 · ops creates an opportunity and attaches supply', async () => {
      await page.goto('/ops/demand')
      await page.getByTestId('demand-buyer').selectOption({ index: 1 })
      await page.getByTestId('demand-crop').selectOption({ label: CROP.MAIZE.en })
      await page.getByTestId('demand-quantity').fill('3000')
      await page.getByTestId('demand-window-start').fill('2026-09-01')
      await page.getByTestId('demand-window-end').fill('2026-09-30')
      await page.getByTestId('demand-quality-note').fill('E2E-journey-demand')
      await page.getByTestId('demand-create-submit').click()
      await expect(page.getByTestId('demand-table')).toContainText('E2E-journey-demand')

      await page.getByTestId('demand-row').filter({ hasText: 'E2E-journey-demand' }).click()
      await expect(page.getByTestId('demand-detail')).toBeVisible()

      await page.getByTestId(`match-row-${ILUNDO}`).getByTestId('create-opportunity').click()
      await page.getByTestId(`match-row-${ILUNDO}`).getByTestId('drill-link').click()
      await expect(page.getByTestId('opportunity-detail')).toBeVisible()

      // The harvest step 1 registered, identified by its own figure. Its id is
      // read off the option rather than guessed, because the RPC minted it.
      const option = page
        .getByTestId('attach-harvest')
        .locator('option')
        .filter({ hasText: '3,140.00 kg' })
      await expect(option).toHaveCount(1)
      const harvestId = await option.getAttribute('value')
      expect(harvestId).toMatch(/^[0-9a-f-]{36}$/)

      await page.getByTestId('attach-harvest').selectOption(harvestId!)
      await page.getByTestId('attach-kg').fill(EXPECTED_KG)
      await page.getByTestId('attach-submit').click()

      // opportunity_resum is the sole writer of offered_quantity_kg: the
      // client never sets this total.
      await expect(page.getByTestId('supply-row')).toHaveCount(1)
      await expect(page.getByTestId('offered-total')).toContainText('3,140.00 kg')
      await expect(page.getByTestId('opportunity-detail')).toContainText(/not a sale/i)
    })

    await test.step('8 · the Tower reflects all of it', async () => {
      await page.goto(`/ops/tower?village=${ILUNDO}`)
      await expect(page.getByTestId('tower')).toBeVisible()

      // Production: seeded 12,000 kg + step 1's 3,140 kg, in the same
      // September maize window.
      await expect(page.getByTestId('tile-production')).toContainText('15,140.00 kg')

      // Energy: seeded approved raw is 15.0 + 2 × 1.5 = 18.0 kW. Step 5
      // approved one more 15 kW mill, so 33.0 × 0.600 = 19.800 kW approved
      // peak and 500.000 − 19.800 = 480.200 kW headroom. Prospective is
      // unchanged at 7.200 kW, and the two are never added together.
      await expect(page.getByTestId('tower-approved-peak')).toHaveText('19.800 kW')
      await expect(page.getByTestId('tower-headroom')).toHaveText('480.200 kW')
      await expect(page.getByTestId('tower-prospective-peak')).toHaveText('7.200 kW')
      await expect(page.getByTestId('tile-energy')).toContainText(/basis: planned/i)

      // Market: step 7 committed the whole 3,140 kg, so the seeded demand's
      // available figure is back to 5,600 kg and its coverage to 62.2%.
      const market = page.getByTestId('tile-market')
      await expect(market).toContainText('9,000.00 kg')
      await expect(market).toContainText('5,600.00 kg')
      await expect(market).toContainText('62.2%')

      // Data quality: Ilundo was 3/6 persons verified, 3/4 farms with GPS and
      // 5/7 cycles with an estimate. Step 1 added a person, a farm without
      // GPS and a cycle with an estimate; step 2 verified the person.
      const quality = page.getByTestId('tile-quality')
      await expect(quality).toContainText('4 / 7')
      await expect(quality).toContainText('3 / 5')
      await expect(quality).toContainText('6 / 8')
    })

    await test.step('8 · and a headline drills to that farmer record', async () => {
      // 1 — the production headline.
      await page.getByTestId('tile-production').getByTestId('tile-drill').click()
      await expect(page.getByTestId('production-table')).toBeVisible()
      await expect(page.getByText('15,140.00 kg').first()).toBeVisible()

      // 2 — the row behind it, reached by the farmer it belongs to.
      const row = page.getByTestId('production-row').filter({ hasText: family })
      await expect(row).toHaveCount(1)
      await expect(row).toContainText('3,140.00 kg')
      await row.getByRole('link', { name: `Test ${family}` }).click()

      // 3 — the record itself.
      await expect(page.getByTestId('person-detail')).toBeVisible()
      await expect(page).toHaveURL(new RegExp(personId))
      await expect(page.getByTestId('person-detail')).toContainText(family)
      await expect(page.getByTestId('person-detail')).toContainText(farmLabel)
      // Traced all the way back to the officer who wrote it, still carrying
      // its provenance.
      await expect(page.getByTestId('provenance-badge').first()).toBeVisible()
    })
  })
})
