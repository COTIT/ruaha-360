/**
 * Units, formats and time — business-rules §14.
 *
 * The client may format, convert display units, and sort an already-fetched
 * page. It may NOT compute aggregates, available-vs-committed supply,
 * coverage percentages, or any stored energy estimate (§11).
 */

const HECTARES_PER_ACRE = 0.40468564224

export type AreaUnit = 'hectare' | 'acre'

/** timestamptz is stored UTC and displayed in the project's timezone. */
export const DISPLAY_TIMEZONE = 'Africa/Dar_es_Salaam'

/** Shown wherever a value is genuinely absent. Never rendered as 0. */
const UNKNOWN = '—'

// en-GB gives "10 Sep 2026" and 24-hour time, which is what the surfaces use.
const LOCALE = 'en-GB'

export function hectaresToAcres(hectares: number): number {
  return hectares / HECTARES_PER_ACRE
}

export function acresToHectares(acres: number): number {
  return acres * HECTARES_PER_ACRE
}

function fixed(value: number, dp: number): string {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })
}

/**
 * Area is ALWAYS stored in hectares (the `hectares` domain). `area_unit` is a
 * display preference from country.default_area_unit. Conversion happens at the
 * edge only — an acre figure is never persisted.
 */
export function formatArea(hectares: number | null, unit: AreaUnit): string {
  if (hectares === null) return UNKNOWN
  return unit === 'acre'
    ? `${fixed(hectaresToAcres(hectares), 4)} ac`
    : `${fixed(hectares, 4)} ha`
}

/** kg, 2 dp. */
export function formatKg(kg: number | null): string {
  return kg === null ? UNKNOWN : `${fixed(kg, 2)} kg`
}

/**
 * kW, 3 dp. Capacity is PLANNED, never measured — callers must show the
 * capacity basis alongside this, which is why `basis` exists on the column.
 */
export function formatKw(kw: number | null): string {
  return kw === null ? UNKNOWN : `${fixed(kw, 3)} kW`
}

/** kWh, 3 dp. */
export function formatKwh(kwh: number | null): string {
  return kwh === null ? UNKNOWN : `${fixed(kwh, 3)} kWh`
}

/**
 * numeric(14,2) plus an explicit currency code, default TZS.
 *
 * The code is always shown, never inferred from a locale. Every price in this
 * system is INDICATIVE and the caller is responsible for labelling it so —
 * these are not quotations.
 */
export function formatMoney(amount: number | null, currency: string): string {
  return amount === null ? UNKNOWN : `${currency} ${fixed(amount, 2)}`
}

/** Percentages, 1 dp. */
export function formatPercent(pct: number | null): string {
  return pct === null ? UNKNOWN : `${fixed(pct, 1)}%`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Parts, not a formatted string: Intl's en-GB short month renders September as
// "Sept", which would disagree with formatPlainDate's "Sep" on the same
// screen. The month name comes from MONTHS so both formatters always agree.
const timestampParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: DISPLAY_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/**
 * A timestamptz, shown in Africa/Dar_es_Salaam (UTC+3 year round).
 *
 * The timezone matters: 21:30 UTC is the next day locally, so rendering in UTC
 * would report a capture as having happened a day earlier.
 */
export function formatTimestamp(iso: string | null): string {
  if (!iso) return UNKNOWN
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return UNKNOWN

  const parts: Record<string, string> = {}
  for (const part of timestampParts.formatToParts(parsed)) parts[part.type] = part.value

  const monthName = MONTHS[Number(parts.month) - 1]
  if (!monthName) return UNKNOWN
  return `${Number(parts.day)} ${monthName} ${parts.year}, ${parts.hour}:${parts.minute}`
}

/**
 * A plain `date` — harvest windows, planting dates.
 *
 * Formatted from its parts, with no Date parsing and no timezone anywhere near
 * it. Round-tripping '2026-09-01' through a timezone can move it to 31 August,
 * and shifting a harvest window by an offset moves a season.
 */
export function formatPlainDate(date: string | null): string {
  if (!date) return UNKNOWN
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return UNKNOWN
  const [, year, month, day] = match
  const monthName = MONTHS[Number(month) - 1]
  if (!monthName) return UNKNOWN
  return `${Number(day)} ${monthName} ${year}`
}
