/**
 * Units, formats and time — business-rules §14.
 *
 * The client may format, convert display units, and sort an already-fetched
 * page. It may NOT compute aggregates, available-vs-committed supply,
 * coverage percentages, or any stored energy estimate (§11).
 */

const HECTARES_PER_ACRE = 0.40468564224

export type AreaUnit = 'hectare' | 'acre'

/**
 * Area is ALWAYS stored in hectares (the `hectares` domain). `area_unit` is a
 * display preference from country.default_area_unit. Convert at the edge only
 * — never persist an acre figure.
 */
export function formatArea(_hectares: number, _unit: AreaUnit): string {
  // TODO: `${value} ha` or `${value / HECTARES_PER_ACRE} ac`
  void HECTARES_PER_ACRE
  throw new Error('formatArea is not implemented yet')
}

/** kg, 2 dp. */
export function formatKg(_kg: number): string {
  throw new Error('formatKg is not implemented yet')
}

/** kW, 3 dp. Always shown with its capacity basis — planned, never measured. */
export function formatKw(_kw: number): string {
  throw new Error('formatKw is not implemented yet')
}

/** kWh, 3 dp. */
export function formatKwh(_kwh: number): string {
  throw new Error('formatKwh is not implemented yet')
}

/**
 * Money: numeric(14,2) plus an explicit currency code, default TZS.
 * Every price is INDICATIVE and must be labelled so at the call site. These
 * are not quotations.
 */
export function formatMoney(_amount: number, _currency: string): string {
  throw new Error('formatMoney is not implemented yet')
}

/** Percentages, 1 dp. */
export function formatPercent(_pct: number): string {
  throw new Error('formatPercent is not implemented yet')
}

/**
 * timestamptz, stored UTC, displayed in Africa/Dar_es_Salaam.
 */
export const DISPLAY_TIMEZONE = 'Africa/Dar_es_Salaam'

export function formatTimestamp(_iso: string): string {
  throw new Error('formatTimestamp is not implemented yet')
}

/**
 * Harvest windows and planting dates are plain `date`. No timezone, NEVER
 * converted — shifting a harvest window by a timezone offset moves a season.
 */
export function formatPlainDate(_date: string): string {
  throw new Error('formatPlainDate is not implemented yet')
}
