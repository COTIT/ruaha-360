import { describe, expect, test } from 'vitest'

import {
  activeMemberships,
  canAccessSurface,
  resolveLanding,
  roleHome,
  safeRedirect,
  writableVillageIds,
} from '@/app/membership'
import type { ActiveMembership } from '@/app/membership'

const m = (
  role: ActiveMembership['role'],
  extra: Partial<ActiveMembership> = {},
): ActiveMembership => ({
  id: crypto.randomUUID(),
  role,
  project_id: '20000000-0000-4000-8000-000000000001',
  village_id: null,
  revoked_at: null,
  ...extra,
})

describe('roleHome', () => {
  test('each product role has its own surface', () => {
    expect(roleHome('farmer')).toBe('/farm')
    expect(roleHome('field_officer')).toBe('/officer')
    expect(roleHome('ops')).toBe('/ops')
  })

  // CLAUDE.md: admin is operational (seed, support), not a product surface.
  // There is no /admin route, and admin's scope in the role matrix is the
  // whole project, identical to ops.
  test('admin lands on the ops surface, since no admin surface exists', () => {
    expect(roleHome('admin')).toBe('/ops')
  })
})

describe('activeMemberships', () => {
  test('drops revoked rows', () => {
    const rows = [m('farmer'), m('ops', { revoked_at: '2026-09-01T00:00:00Z' })]
    expect(activeMemberships(rows)).toHaveLength(1)
    expect(activeMemberships(rows)[0].role).toBe('farmer')
  })

  test('a fully revoked user has no active memberships', () => {
    expect(activeMemberships([m('ops', { revoked_at: '2026-09-01T00:00:00Z' })])).toEqual([])
  })
})

describe('resolveLanding', () => {
  // Spec 4.2: 0 rows -> /no-access, 1 row -> that role's home,
  // 2+ rows -> /select-role.
  test('zero memberships is a real screen, not a crash', () => {
    expect(resolveLanding([])).toEqual({ to: '/no-access' })
  })

  test('one membership goes straight to that role home', () => {
    expect(resolveLanding([m('farmer')])).toEqual({ to: '/farm' })
    expect(resolveLanding([m('field_officer')])).toEqual({ to: '/officer' })
    expect(resolveLanding([m('ops')])).toEqual({ to: '/ops' })
  })

  test('two or more memberships need the picker', () => {
    expect(resolveLanding([m('farmer'), m('field_officer')])).toEqual({ to: '/select-role' })
  })

  test('revoked rows do not count toward the picker', () => {
    const rows = [m('farmer'), m('ops', { revoked_at: '2026-09-01T00:00:00Z' })]
    expect(resolveLanding(rows)).toEqual({ to: '/farm' })
  })

  test('a user whose only membership was revoked gets no-access', () => {
    expect(resolveLanding([m('ops', { revoked_at: '2026-09-01T00:00:00Z' })])).toEqual({
      to: '/no-access',
    })
  })
})

describe('canAccessSurface', () => {
  // Spec 3: beforeLoad redirects when the role does not match. Spec 13: the
  // guard is UX, not security — RLS still returns zero rows if someone gets
  // through. This function only answers the UX question.
  test('a farmer may only enter the farmer surface', () => {
    const rows = [m('farmer')]
    expect(canAccessSurface(rows, 'farmer')).toBe(true)
    expect(canAccessSurface(rows, 'officer')).toBe(false)
    expect(canAccessSurface(rows, 'ops')).toBe(false)
  })

  test('an officer may only enter the officer surface', () => {
    const rows = [m('field_officer')]
    expect(canAccessSurface(rows, 'officer')).toBe(true)
    expect(canAccessSurface(rows, 'farmer')).toBe(false)
  })

  test('ops and admin both reach the ops surface, Tower included', () => {
    expect(canAccessSurface([m('ops')], 'ops')).toBe(true)
    expect(canAccessSurface([m('admin')], 'ops')).toBe(true)
  })

  test('holding two roles opens both surfaces', () => {
    const rows = [m('farmer'), m('field_officer')]
    expect(canAccessSurface(rows, 'farmer')).toBe(true)
    expect(canAccessSurface(rows, 'officer')).toBe(true)
    expect(canAccessSurface(rows, 'ops')).toBe(false)
  })

  test('a revoked role closes its surface on the next evaluation', () => {
    const rows = [m('ops', { revoked_at: '2026-09-01T00:00:00Z' })]
    expect(canAccessSurface(rows, 'ops')).toBe(false)
  })
})

describe('safeRedirect', () => {
  test('keeps an in-app path', () => {
    expect(safeRedirect('/ops/tower')).toBe('/ops/tower')
    expect(safeRedirect('/farm')).toBe('/farm')
  })

  test('keeps a path with a query string', () => {
    expect(safeRedirect('/ops/requests?status=submitted')).toBe('/ops/requests?status=submitted')
  })

  // The value arrives from the URL, so it is attacker-controllable. Anything
  // that could leave the origin is discarded rather than sanitised.
  test('discards anything that could leave the origin', () => {
    expect(safeRedirect('//evil.example.com')).toBeUndefined()
    expect(safeRedirect('https://evil.example.com')).toBeUndefined()
    expect(safeRedirect('http://evil.example.com')).toBeUndefined()
    expect(safeRedirect('javascript:alert(1)')).toBeUndefined()
    expect(safeRedirect('/\\evil.example.com')).toBeUndefined()
  })

  test('discards relative and empty values', () => {
    expect(safeRedirect('ops')).toBeUndefined()
    expect(safeRedirect('')).toBeUndefined()
    expect(safeRedirect(undefined)).toBeUndefined()
  })

  test('does not send anyone back to the login screen', () => {
    expect(safeRedirect('/login')).toBeUndefined()
  })
})

describe('writableVillageIds', () => {
  const ILUNDO = '30000000-0000-4000-8000-000000000001'
  const MGAMA = '30000000-0000-4000-8000-000000000002'

  test('an officer may write into the village they are assigned', () => {
    expect(writableVillageIds([m('field_officer', { village_id: ILUNDO })])).toEqual([ILUNDO])
  })

  test('two assignments give two villages', () => {
    const rows = [
      m('field_officer', { village_id: ILUNDO }),
      m('field_officer', { village_id: MGAMA }),
    ]
    expect(writableVillageIds(rows).sort()).toEqual([ILUNDO, MGAMA].sort())
  })

  // village_id NULL is whole-project scope. There is no single village to
  // register into, so ops must choose one rather than have one inferred.
  test('a project-wide membership yields no specific village', () => {
    expect(writableVillageIds([m('ops', { village_id: null })])).toEqual([])
  })

  test('a farmer village is not writable', () => {
    expect(writableVillageIds([m('farmer', { village_id: ILUNDO })])).toEqual([])
  })

  test('revoked assignments do not grant a village', () => {
    expect(
      writableVillageIds([
        m('field_officer', { village_id: ILUNDO, revoked_at: '2026-09-01T00:00:00Z' }),
      ]),
    ).toEqual([])
  })

  test('duplicates collapse', () => {
    const rows = [
      m('field_officer', { village_id: ILUNDO }),
      m('field_officer', { village_id: ILUNDO }),
    ]
    expect(writableVillageIds(rows)).toEqual([ILUNDO])
  })
})
