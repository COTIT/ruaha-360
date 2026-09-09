import { describe, expect, test } from 'vitest'

import { buildRegisterPayload, type RegisterForm } from '@/features/officer/registerPayload'

const VILLAGE = '30000000-0000-4000-8000-000000000001'
const CLIENT_REF = 'c0ffee00-0000-4000-8000-000000000001'
const MAIZE = '40000000-0000-4000-8000-000000000001'

const form = (over: Partial<RegisterForm> = {}): RegisterForm => ({
  given_name: 'Test',
  family_name: 'E2E-abc',
  phone: '',
  household_label: '',
  is_head: true,
  farm_label: 'E2E-abc farm',
  farm_latitude: '',
  farm_longitude: '',
  plot_label: 'E2E-abc plot',
  plot_area_ha: '1.5',
  crop_id: MAIZE,
  season_label: '',
  cycle_area_ha: '1.2',
  cycle_tree_count: '',
  cycle_unit_count: '',
  planted_on: '',
  harvest_start: '2026-09-01',
  harvest_end: '2026-09-30',
  harvest_quantity_kg: '3000',
  confidence: 'high',
  ...over,
})

const build = (over: Partial<RegisterForm> = {}, measure: 'area' | 'tree_count' | 'unit_count' = 'area') =>
  buildRegisterPayload(form(over), { clientRef: CLIENT_REF, villageId: VILLAGE, measure })

describe('buildRegisterPayload', () => {
  test('carries the client_ref and village at the top level', () => {
    const p = build()
    expect(p.client_ref).toBe(CLIENT_REF)
    expect(p.village_id).toBe(VILLAGE)
  })

  test('never sends provenance: the RPC stamps field_verified server-side', () => {
    const p = build()
    expect(p).not.toHaveProperty('source')
    expect(p.person).not.toHaveProperty('source')
    expect(p.person).not.toHaveProperty('captured_by')
    expect(p.farm).not.toHaveProperty('source')
  })

  test('an omitted phone is sent as empty, which the RPC nullifs', () => {
    expect(build({ phone: '' }).person.phone).toBe('')
    expect(build({ phone: '+255700000999' }).person.phone).toBe('+255700000999')
  })

  test('an omitted household label lets the RPC derive one from the family name', () => {
    expect(build({ household_label: '' }).household.label).toBe('')
    expect(build({ household_label: 'Mine' }).household.label).toBe('Mine')
  })

  test('is_head is carried through', () => {
    expect(build({ is_head: false }).household.is_head).toBe(false)
  })

  // The RPC raises 'this crop is measured by area: area_ha is required' and
  // its siblings. Sending the wrong measure is a guaranteed failure, so only
  // the matching one goes.
  test('an area crop sends area_ha and neither count', () => {
    const cycle = build({ cycle_area_ha: '1.2', cycle_tree_count: '99', cycle_unit_count: '7' }, 'area').cycle
    expect(cycle.area_ha).toBe('1.2')
    expect(cycle.tree_count).toBe('')
    expect(cycle.unit_count).toBe('')
  })

  test('a tree-count crop sends tree_count only', () => {
    const cycle = build({ cycle_area_ha: '1.2', cycle_tree_count: '99' }, 'tree_count').cycle
    expect(cycle.tree_count).toBe('99')
    expect(cycle.area_ha).toBe('')
    expect(cycle.unit_count).toBe('')
  })

  test('a unit-count crop sends unit_count only', () => {
    const cycle = build({ cycle_unit_count: '24', cycle_area_ha: '1.2' }, 'unit_count').cycle
    expect(cycle.unit_count).toBe('24')
    expect(cycle.area_ha).toBe('')
    expect(cycle.tree_count).toBe('')
  })

  test('the harvest figure travels with the cycle', () => {
    expect(build().harvest.quantity_kg).toBe('3000')
  })

  // An expected harvest is optional: a cycle can be registered without one.
  test('an omitted harvest quantity is sent empty so the RPC skips the report', () => {
    expect(build({ harvest_quantity_kg: '' }).harvest.quantity_kg).toBe('')
  })

  test('dates pass through untouched, never timezone-converted', () => {
    const p = build({ harvest_start: '2026-09-01', harvest_end: '2026-09-30', planted_on: '2026-03-05' })
    expect(p.cycle.harvest_start).toBe('2026-09-01')
    expect(p.cycle.harvest_end).toBe('2026-09-30')
    expect(p.cycle.planted_on).toBe('2026-03-05')
  })

  test('the cycle status defaults to growing, matching the RPC default', () => {
    expect(build().cycle.status).toBe('growing')
  })

  test('confidence is carried on each observed record', () => {
    const p = build({ confidence: 'medium' })
    expect(p.person.confidence).toBe('medium')
    expect(p.farm.confidence).toBe('medium')
    expect(p.plot.confidence).toBe('medium')
    expect(p.cycle.confidence).toBe('medium')
    expect(p.harvest.confidence).toBe('medium')
  })

  test('GPS is optional and sent empty when not captured', () => {
    expect(build({ farm_latitude: '', farm_longitude: '' }).farm.latitude).toBe('')
    const p = build({ farm_latitude: '-8.1301', farm_longitude: '35.1892' })
    expect(p.farm.latitude).toBe('-8.1301')
    expect(p.farm.longitude).toBe('35.1892')
  })
})
