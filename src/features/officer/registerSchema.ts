import { z } from 'zod'

import type { RegisterForm } from '@/features/officer/registerPayload'
import type { Database } from '@/lib/db.types'

export type CropMeasure = Database['public']['Enums']['crop_measure']

/**
 * The register form's validation — spec 5.2, QA #16, #19, #21, #27.
 *
 * **What belongs here and what does not.** CLAUDE.md forbids pre-validating
 * rules the database enforces, and that rule is about BUSINESS logic: the
 * status machine, the over-commitment guard, who may verify what. A copy of
 * one of those drifts within a fortnight and the copy is what the user sees.
 *
 * None of that is what this file does. It checks that a number is a number,
 * that a name is not three spaces, that an end date follows a start date, and
 * that a value fits the column it is going into. Those are properties of the
 * form's own inputs, and the alternative is not "the database decides" — it is
 * a round trip that returns `numeric field overflow` naming no field, or a
 * constraint identifier rendered as user copy.
 *
 * Every message is an i18n key, resolved at render, like `LoginScreen`.
 *
 * The RPC still owns everything real. It nullifs blanks itself
 * (`nullif(cy->>'area_ha','')::hectares`), so blanks stay blank here rather
 * than becoming zeros, and its own messages still come back verbatim.
 */

/** A required free-text field: trimmed, and not empty once trimmed. */
const requiredText = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, 'register.required')

/** An optional free-text field. Trimmed so `"   "` is stored as nothing. */
const optionalText = z.string().transform((s) => s.trim())

interface NumberRules {
  /** Largest value the column will hold — `numeric(p,s)` gives 10^(p−s) − 1. */
  max: number
  min?: number
  /** Message key when outside the range. Defaults differ by end. */
  belowKey?: string
  aboveKey?: string
  integer?: boolean
}

/**
 * An optional numeric field, as text.
 *
 * Stays a string all the way through: the RPC takes jsonb and decides what a
 * blank means, and converting to a number here would turn "" into 0 — a
 * measured zero where the officer answered nothing.
 */
function numericText(rules: NumberRules) {
  const {
    max,
    min = 0,
    belowKey = 'register.notNegative',
    aboveKey = 'register.tooLarge',
    integer = false,
  } = rules

  return z
    .string()
    .transform((s) => s.trim())
    .superRefine((value, ctx) => {
      if (value === '') return

      const n = Number(value)
      if (!Number.isFinite(n)) {
        ctx.addIssue({ code: 'custom', message: 'register.notANumber' })
        return
      }
      if (integer && !Number.isInteger(n)) {
        ctx.addIssue({ code: 'custom', message: 'register.wholeNumber' })
        return
      }
      if (n < min) ctx.addIssue({ code: 'custom', message: belowKey })
      if (n > max) ctx.addIssue({ code: 'custom', message: aboveKey })
    })
}

/** `hectares` is `numeric(10,4) check (value >= 0)`. */
const hectares = numericText({ max: 999_999.9999 })
/** `harvest_report.quantity_kg` is `numeric(12,2) check (quantity_kg >= 0)`. */
const quantityKg = numericText({ max: 9_999_999_999.99 })
/** `plot.latitude` / `longitude` are `numeric(9,6)` with their own ranges. */
// One message for either end: "-95" and "95" are the same mistake, and
// "too large" is the wrong word for a latitude.
const latitude = numericText({
  max: 90,
  min: -90,
  belowKey: 'register.latitudeRange',
  aboveKey: 'register.latitudeRange',
})
const longitude = numericText({
  max: 180,
  min: -180,
  belowKey: 'register.longitudeRange',
  aboveKey: 'register.longitudeRange',
})
const wholeCount = numericText({ max: 2_147_483_647, integer: true })

const base = z.object({
  given_name: requiredText,
  family_name: requiredText,
  phone: optionalText,
  household_label: optionalText,
  is_head: z.boolean(),
  farm_label: requiredText,
  farm_latitude: latitude,
  farm_longitude: longitude,
  plot_label: requiredText,
  plot_area_ha: hectares,
  crop_id: z.string().min(1, 'register.required'),
  season_label: optionalText,
  cycle_area_ha: hectares,
  cycle_tree_count: wholeCount,
  cycle_unit_count: wholeCount,
  planted_on: z.string(),
  harvest_start: z.string(),
  harvest_end: z.string(),
  harvest_quantity_kg: quantityKg,
  confidence: z.enum(['low', 'medium', 'high']),
})

/** Which field the crop's own `measured_by` makes mandatory. */
const MEASURE_FIELD = {
  area: 'cycle_area_ha',
  tree_count: 'cycle_tree_count',
  unit_count: 'cycle_unit_count',
} as const satisfies Record<CropMeasure, keyof z.infer<typeof base>>

/**
 * The schema, for the crop currently chosen.
 *
 * A factory rather than one static schema because the mandatory measure field
 * depends on another field's ANSWER, not on its presence. With no crop chosen
 * there is no measure to demand, and `crop_id` already carries that error —
 * two messages for one missing answer reads as two problems.
 */
export function registerSchema(measure: CropMeasure | undefined) {
  return base.superRefine((form, ctx) => {
    if (measure) {
      const field = MEASURE_FIELD[measure]
      if (form[field] === '') {
        ctx.addIssue({ code: 'custom', path: [field], message: 'register.required' })
      }
    }

    // `cycle_window_sane`: harvest_end >= harvest_start, either may be null.
    // Reported on the end date, which is the one that is wrong.
    if (form.harvest_start && form.harvest_end && form.harvest_end < form.harvest_start) {
      ctx.addIssue({
        code: 'custom',
        path: ['harvest_end'],
        message: 'register.windowBackwards',
      })
    }
  })
}

/**
 * The value a column will actually store, when that differs from what was
 * typed — QA #27.
 *
 * `hectares` is `numeric(10,4)`, so `1.23456789` is stored as `1.2346`:
 * correct, and silent. Returns null when nothing changes, so a correct entry
 * gets no notice. Trailing zeros are not a change.
 */
export function roundedTo(value: string, dp: number): string | null {
  const text = value.trim()
  if (text === '') return null

  const n = Number(text)
  if (!Number.isFinite(n)) return null

  const rounded = n.toFixed(dp)
  return Number(rounded) === n ? null : rounded
}

/** Every field a `RegisterForm` holds, with the type it must hold. */
const DRAFT_FIELDS = {
  given_name: 'string',
  family_name: 'string',
  phone: 'string',
  household_label: 'string',
  is_head: 'boolean',
  farm_label: 'string',
  farm_latitude: 'string',
  farm_longitude: 'string',
  plot_label: 'string',
  plot_area_ha: 'string',
  crop_id: 'string',
  season_label: 'string',
  cycle_area_ha: 'string',
  cycle_tree_count: 'string',
  cycle_unit_count: 'string',
  planted_on: 'string',
  harvest_start: 'string',
  harvest_end: 'string',
  harvest_quantity_kg: 'string',
  confidence: 'string',
} as const

const CONFIDENCE = ['low', 'medium', 'high']

/**
 * Is this stored object still a draft of THIS form? — QA #22.
 *
 * Shape only, deliberately. A half-filled draft is the whole point of the
 * feature, so an empty required field restores; what must not restore is an
 * object whose fields are the wrong TYPE, which rendered as the literal
 * `[object Object]` in the first name and would have been submitted.
 *
 * The realistic producer is a draft written by an older deployment of the
 * form, on a phone that was mid-registration when the app updated. An extra
 * key is therefore tolerated — a field this version dropped costs nothing —
 * while a missing or retyped one is not.
 */
export function isRegisterDraft(value: unknown): value is RegisterForm {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false

  const draft = value as Record<string, unknown>
  for (const [field, type] of Object.entries(DRAFT_FIELDS)) {
    if (typeof draft[field] !== type) return false
  }
  return CONFIDENCE.includes(draft.confidence as string)
}
