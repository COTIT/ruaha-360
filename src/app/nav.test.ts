import { describe, expect, test } from 'vitest'

import { navItemsFor, navLayoutForPath, surfaceForPath } from '@/app/nav'
import type { ActiveMembership } from '@/app/membership'

const m = (role: ActiveMembership['role']): ActiveMembership => ({
  id: crypto.randomUUID(),
  role,
  project_id: '20000000-0000-4000-8000-000000000001',
  village_id: null,
  revoked_at: null,
})

describe('surfaceForPath', () => {
  test('maps each route group to its surface', () => {
    expect(surfaceForPath('/farm')).toBe('farmer')
    expect(surfaceForPath('/farm/my-farm')).toBe('farmer')
    expect(surfaceForPath('/officer')).toBe('officer')
    expect(surfaceForPath('/officer/register')).toBe('officer')
    expect(surfaceForPath('/ops')).toBe('ops')
    expect(surfaceForPath('/ops/tower')).toBe('ops')
    expect(surfaceForPath('/ops/tower/energy')).toBe('ops')
  })

  test('auth routes belong to no surface', () => {
    expect(surfaceForPath('/login')).toBeUndefined()
    expect(surfaceForPath('/select-role')).toBeUndefined()
    expect(surfaceForPath('/no-access')).toBeUndefined()
    expect(surfaceForPath('/')).toBeUndefined()
  })

  test('a path that merely starts with the same letters is not a match', () => {
    expect(surfaceForPath('/farmers-market')).toBeUndefined()
    expect(surfaceForPath('/operations')).toBeUndefined()
  })
})

describe('navLayoutForPath', () => {
  // Spec 4.1: Farmer and Officer get a bottom tab bar; Ops gets a sidebar.
  // The farmer and officer surfaces are mobile-first, ops is desktop-first.
  test('farmer and officer surfaces use a bottom tab bar', () => {
    expect(navLayoutForPath('/farm')).toBe('tabs')
    expect(navLayoutForPath('/farm/equipment')).toBe('tabs')
    expect(navLayoutForPath('/officer')).toBe('tabs')
  })

  test('the ops surface uses a sidebar, Tower included', () => {
    expect(navLayoutForPath('/ops')).toBe('sidebar')
    expect(navLayoutForPath('/ops/tower')).toBe('sidebar')
  })

  test('signed-out and auth screens get no nav at all', () => {
    expect(navLayoutForPath('/login')).toBe('none')
    expect(navLayoutForPath('/no-access')).toBe('none')
  })
})

describe('navItemsFor', () => {
  test('the farmer tab bar is the farmer surface only', () => {
    const items = navItemsFor('farmer', [m('farmer')])
    expect(items.map((i) => i.to)).toEqual([
      '/farm/my-farm',
      '/farm/equipment',
      '/farm/requests',
      '/farm/opportunities',
    ])
  })

  test('the officer tab bar is the officer surface only', () => {
    const items = navItemsFor('officer', [m('field_officer')])
    expect(items.map((i) => i.to)).toEqual([
      '/officer/register',
      '/officer/people',
      '/officer/verify',
    ])
  })

  test('the ops sidebar covers the ops surface and the Tower', () => {
    const items = navItemsFor('ops', [m('ops')])
    expect(items.map((i) => i.to)).toEqual([
      '/ops/requests',
      '/ops/demand',
      '/ops/catalogue',
      '/ops/buyers',
      '/ops/villages',
      '/ops/tower',
    ])
  })

  test('admin gets the same sidebar as ops', () => {
    expect(navItemsFor('ops', [m('admin')]).map((i) => i.to)).toEqual(
      navItemsFor('ops', [m('ops')]).map((i) => i.to),
    )
  })

  // A surface the session does not open lists nothing, so nav never advertises
  // a route the guard would immediately bounce.
  test('a surface the session does not open lists nothing', () => {
    expect(navItemsFor('ops', [m('farmer')])).toEqual([])
    expect(navItemsFor('farmer', [m('ops')])).toEqual([])
  })
})
