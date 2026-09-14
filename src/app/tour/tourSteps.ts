import type { Surface } from '@/app/membership'

/**
 * A stop on a guided tour, as data.
 *
 * `testId` rather than a CSS selector: `data-testid` is already a contract this
 * repo keeps — `pnpm e2e` fails when one moves — so the tour inherits that
 * contract instead of inventing a parallel one out of class names, which would
 * rot on the next restyle without a single test failing.
 *
 * `route` is where the stop lives. The tour navigates there before showing it,
 * which is what lets a tour explain a whole role rather than one screen.
 */
export interface TourStep {
  testId: string
  route: string
  titleKey: string
  bodyKey: string
  /** `center` parks the bubble mid-screen, for a stop that is about a whole page. */
  placement?: 'auto' | 'center' | 'top' | 'bottom' | 'left' | 'right'
}

/**
 * One tour per surface, in the order the work actually happens.
 *
 * Each route gets one contiguous run of stops: a tour that visits Register,
 * then People, then Register again has made the user travel twice to say one
 * thing. `tourSteps.test.ts` holds that, along with every target existing and
 * every string being a key.
 *
 * The copy carries the product's own rules, because this is the first thing a
 * new user reads and a tour is exactly where a sloppy summary would do damage:
 * an estimate is called an estimate, a price is indicative, an opportunity is
 * not a sale, capacity is planned and never measured.
 */
export const TOURS: Record<Surface, TourStep[]> = {
  farmer: [
    {
      route: '/farm',
      testId: 'farm-home',
      titleKey: 'tour.farmer.welcomeTitle',
      bodyKey: 'tour.farmer.welcomeBody',
      placement: 'center',
    },
    {
      route: '/farm',
      testId: 'farm-home-summary',
      titleKey: 'tour.farmer.summaryTitle',
      bodyKey: 'tour.farmer.summaryBody',
    },
    {
      route: '/farm/my-farm',
      testId: 'my-farm',
      titleKey: 'tour.farmer.recordsTitle',
      bodyKey: 'tour.farmer.recordsBody',
    },
    {
      route: '/farm/equipment',
      testId: 'equipment-list',
      titleKey: 'tour.farmer.equipmentTitle',
      bodyKey: 'tour.farmer.equipmentBody',
    },
    {
      route: '/farm/requests',
      testId: 'requests-list',
      titleKey: 'tour.farmer.requestsTitle',
      bodyKey: 'tour.farmer.requestsBody',
    },
    {
      route: '/farm/opportunities',
      testId: 'farmer-opportunities',
      titleKey: 'tour.farmer.opportunitiesTitle',
      bodyKey: 'tour.farmer.opportunitiesBody',
    },
  ],

  officer: [
    {
      route: '/officer',
      testId: 'officer-home',
      titleKey: 'tour.officer.welcomeTitle',
      bodyKey: 'tour.officer.welcomeBody',
      placement: 'center',
    },
    {
      route: '/officer',
      testId: 'officer-unverified',
      titleKey: 'tour.officer.outstandingTitle',
      bodyKey: 'tour.officer.outstandingBody',
    },
    {
      route: '/officer/register',
      testId: 'register-progress',
      titleKey: 'tour.officer.registerTitle',
      bodyKey: 'tour.officer.registerBody',
    },
    {
      route: '/officer/register',
      testId: 'register-submit',
      titleKey: 'tour.officer.oneSubmitTitle',
      bodyKey: 'tour.officer.oneSubmitBody',
    },
    {
      route: '/officer/people',
      testId: 'people-search',
      titleKey: 'tour.officer.peopleTitle',
      bodyKey: 'tour.officer.peopleBody',
    },
    {
      route: '/officer/verify',
      testId: 'verify-queue',
      titleKey: 'tour.officer.verifyTitle',
      bodyKey: 'tour.officer.verifyBody',
    },
  ],

  ops: [
    {
      route: '/ops',
      testId: 'ops-home',
      titleKey: 'tour.ops.welcomeTitle',
      bodyKey: 'tour.ops.welcomeBody',
      placement: 'center',
    },
    {
      route: '/ops',
      testId: 'ops-queue-requests',
      titleKey: 'tour.ops.queueTitle',
      bodyKey: 'tour.ops.queueBody',
    },
    {
      route: '/ops/requests',
      testId: 'requests-table',
      titleKey: 'tour.ops.requestsTitle',
      bodyKey: 'tour.ops.requestsBody',
    },
    {
      route: '/ops/demand',
      testId: 'demand-table',
      titleKey: 'tour.ops.demandTitle',
      bodyKey: 'tour.ops.demandBody',
    },
    {
      route: '/ops/tower',
      testId: 'tower',
      titleKey: 'tour.ops.towerTitle',
      bodyKey: 'tour.ops.towerBody',
      placement: 'center',
    },
    {
      route: '/ops/tower',
      testId: 'tower-village',
      titleKey: 'tour.ops.towerVillageTitle',
      bodyKey: 'tour.ops.towerVillageBody',
    },
  ],
}
