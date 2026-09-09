import { describe, expect, test } from 'vitest'

import {
  DISPLAY_TIMEZONE,
  acresToHectares,
  formatArea,
  formatKg,
  formatKw,
  formatKwh,
  formatMoney,
  formatPercent,
  formatPlainDate,
  formatTimestamp,
  hectaresToAcres,
} from '@/lib/format'

describe('area', () => {
  // Storage is ALWAYS hectares. area_unit is a display preference only.
  test('hectares display as hectares', () => {
    expect(formatArea(1.8, 'hectare')).toBe('1.8000 ha')
  })

  test('hectares convert for display in acres', () => {
    expect(formatArea(1, 'acre')).toBe('2.4711 ac')
  })

  test('conversion round-trips within storage precision', () => {
    expect(acresToHectares(hectaresToAcres(1.8))).toBeCloseTo(1.8, 6)
  })

  test('zero is a real value, not a blank', () => {
    expect(formatArea(0, 'hectare')).toBe('0.0000 ha')
  })

  test('null area reads as unknown rather than zero', () => {
    expect(formatArea(null, 'hectare')).toBe('—')
  })
})

describe('weight, power, energy', () => {
  test('weight is kg at 2 dp', () => {
    expect(formatKg(4100)).toBe('4,100.00 kg')
    expect(formatKg(0)).toBe('0.00 kg')
  })

  test('power is kW at 3 dp', () => {
    expect(formatKw(10.8)).toBe('10.800 kW')
  })

  test('energy is kWh at 3 dp', () => {
    expect(formatKwh(540)).toBe('540.000 kWh')
  })

  test('nulls read as unknown', () => {
    expect(formatKg(null)).toBe('—')
    expect(formatKw(null)).toBe('—')
    expect(formatKwh(null)).toBe('—')
  })
})

describe('money', () => {
  // numeric(14,2) plus an explicit currency code, default TZS. Every price is
  // indicative — the caller is responsible for saying so.
  test('shows the amount with its currency code', () => {
    expect(formatMoney(22000000, 'TZS')).toBe('TZS 22,000,000.00')
  })

  test('a different currency is never assumed away', () => {
    expect(formatMoney(1500.5, 'USD')).toBe('USD 1,500.50')
  })

  test('null reads as unknown', () => {
    expect(formatMoney(null, 'TZS')).toBe('—')
  })
})

describe('percentages', () => {
  test('one decimal place', () => {
    expect(formatPercent(62.222)).toBe('62.2%')
    expect(formatPercent(100)).toBe('100.0%')
  })

  test('null reads as unknown', () => {
    expect(formatPercent(null)).toBe('—')
  })
})

describe('timestamps', () => {
  test('displayed in the project timezone', () => {
    expect(DISPLAY_TIMEZONE).toBe('Africa/Dar_es_Salaam')
  })

  // Africa/Dar_es_Salaam is UTC+3 year round, so 21:30 UTC is the next day
  // locally. Getting this wrong shifts a capture date by a day.
  test('a late UTC timestamp shows the local date, not the UTC one', () => {
    expect(formatTimestamp('2026-09-09T21:30:00Z')).toBe('10 Sep 2026, 00:30')
  })

  test('an early UTC timestamp stays on the same local day', () => {
    expect(formatTimestamp('2026-09-10T06:00:00Z')).toBe('10 Sep 2026, 09:00')
  })

  test('null reads as unknown', () => {
    expect(formatTimestamp(null)).toBe('—')
  })
})

describe('plain dates', () => {
  // Harvest windows and planting dates are plain `date`. No timezone, NEVER
  // converted — shifting one by an offset moves a season.
  test('a plain date renders exactly as stored', () => {
    expect(formatPlainDate('2026-09-01')).toBe('1 Sep 2026')
  })

  test('the first of a month does not slip to the previous month', () => {
    expect(formatPlainDate('2026-01-01')).toBe('1 Jan 2026')
  })

  test('the last of a month does not slip forward', () => {
    expect(formatPlainDate('2026-09-30')).toBe('30 Sep 2026')
  })

  test('null reads as unknown', () => {
    expect(formatPlainDate(null)).toBe('—')
  })
})
