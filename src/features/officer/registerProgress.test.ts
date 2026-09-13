import { describe, expect, test } from 'vitest'

import type { RegisterForm } from '@/features/officer/registerPayload'
import {
  REGISTER_GROUPS,
  completedGroups,
  isGroupComplete,
} from '@/features/officer/registerProgress'

const EMPTY: RegisterForm = {
  given_name: '',
  family_name: '',
  phone: '',
  household_label: '',
  is_head: true,
  farm_label: '',
  farm_latitude: '',
  farm_longitude: '',
  plot_label: '',
  plot_area_ha: '',
  crop_id: '',
  season_label: '',
  cycle_area_ha: '',
  cycle_tree_count: '',
  cycle_unit_count: '',
  planted_on: '',
  harvest_start: '',
  harvest_end: '',
  harvest_quantity_kg: '',
  confidence: 'medium',
}

/**
 * The completion rail. Six chips, one per group the RPC creates, so the officer
 * can see what is done and what is left without the form being split into six
 * submits — it is still one page, one submit, one transaction.
 */
describe('which groups are filled in', () => {
  test('nothing typed, nothing complete', () => {
    expect(completedGroups(EMPTY, undefined)).toEqual([])
  })

  test('the groups are the six the RPC creates, in the order it creates them', () => {
    expect(REGISTER_GROUPS).toEqual([
      'person',
      'household',
      'farm',
      'plot',
      'cycle',
      'harvest',
    ])
  })

  test('a person needs both names; a phone is optional and does not count', () => {
    expect(isGroupComplete('person', { ...EMPTY, given_name: 'Amina' }, undefined)).toBe(false)
    expect(
      isGroupComplete('person', { ...EMPTY, given_name: 'Amina', family_name: 'Sanga' }, undefined),
    ).toBe(true)
    expect(isGroupComplete('person', { ...EMPTY, phone: '+255700000101' }, undefined)).toBe(false)
  })

  test('whitespace is not an answer', () => {
    expect(
      isGroupComplete('person', { ...EMPTY, given_name: '  ', family_name: '  ' }, undefined),
    ).toBe(false)
  })

  test('a plot needs its area as well as its name', () => {
    expect(isGroupComplete('plot', { ...EMPTY, plot_label: 'Kipande' }, undefined)).toBe(false)
    expect(
      isGroupComplete('plot', { ...EMPTY, plot_label: 'Kipande', plot_area_ha: '0.6' }, undefined),
    ).toBe(true)
  })

  // The crop decides which measure field is asked for, so the rail has to ask
  // for the same one the form is showing.
  test('a crop cycle asks for the measure its crop uses, and no other', () => {
    const base = {
      ...EMPTY,
      crop_id: 'maize',
      harvest_start: '2026-09-01',
      harvest_end: '2026-09-30',
    }

    expect(isGroupComplete('cycle', { ...base, cycle_area_ha: '0.6' }, 'area')).toBe(true)
    expect(isGroupComplete('cycle', { ...base, cycle_tree_count: '40' }, 'area')).toBe(false)
    expect(isGroupComplete('cycle', { ...base, cycle_tree_count: '40' }, 'tree_count')).toBe(true)
    expect(isGroupComplete('cycle', { ...base, cycle_unit_count: '12' }, 'unit_count')).toBe(true)
  })

  test('with no crop chosen there is no measure to ask for, so the group is open', () => {
    expect(
      isGroupComplete(
        'cycle',
        { ...EMPTY, harvest_start: '2026-09-01', harvest_end: '2026-09-30' },
        undefined,
      ),
    ).toBe(false)
  })

  test('a filled form completes all six', () => {
    const full: RegisterForm = {
      ...EMPTY,
      given_name: 'Amina',
      family_name: 'Sanga',
      household_label: 'Kaya ya Sanga',
      farm_label: 'Shamba la Sanga',
      plot_label: 'Kipande kimoja',
      plot_area_ha: '0.6',
      crop_id: 'maize',
      cycle_area_ha: '0.6',
      harvest_start: '2026-09-01',
      harvest_end: '2026-09-30',
      harvest_quantity_kg: '1450',
    }

    expect(completedGroups(full, 'area')).toEqual([...REGISTER_GROUPS])
  })
})
