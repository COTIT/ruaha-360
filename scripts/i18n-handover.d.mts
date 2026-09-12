/**
 * Types for `i18n-handover.mjs`.
 *
 * The script is plain JavaScript so `node scripts/i18n-handover.mjs` runs it
 * with no build step, while `src/i18n/handover.test.ts` still imports the pure
 * functions with real types.
 */

/** Nested translation namespaces flattened to i18next's dotted keys. */
export function flatten(source: unknown, prefix?: string): Record<string, string>

/**
 * `required` — farmer and officer surfaces, plus the chrome both render.
 * `optional` — ops and tower, which may ship English for the demo.
 */
export type Surface = 'required' | 'optional'

export function SURFACE_OF(key: string): Surface

export interface HandoverRow {
  key: string
  surface: Surface
  english: string
  /** Empty until a native reviewer supplies it. */
  swahili: string
  translated: boolean
  /** i18next placeholders, which must survive translation intact. */
  placeholders: string[]
  /** A labelling rule from CLAUDE.md, where one governs this string. */
  note: string
}

export function buildHandover(en: unknown, sw: unknown): HandoverRow[]

export function renderHandover(rows: HandoverRow[], options: { generated: string }): string
