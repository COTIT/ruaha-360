/**
 * Provenance — business-rules §4. Write this before the second feature, not
 * after the thirtieth call site.
 */

// TODO(tier 1): import from the generated types instead of restating them:
//   import type { Database } from '@/lib/db.types'
//   type SourceType = Database['public']['Enums']['source_type']
export type SourceType =
  | 'farmer_reported'
  | 'field_verified'
  | 'transaction_derived'
  | 'sensor_derived'
  | 'model_estimated'

/**
 * OBSERVED tables, which carry the full provenance block and must go through
 * withProvenance():
 *   person · household · farm · plot · crop_cycle · harvest_report ·
 *   pue_request
 *
 * CONFIG tables, which have NO provenance columns — do not try to set them:
 *   country · project · village · crop · equipment_category · equipment ·
 *   buyer · village_capacity
 *
 * buyer_demand is neither: it deliberately has no `source` column. The five
 * source categories classify how a fact about the productive economy was
 * learned, and a buyer's stated requirement is a counterparty input. It
 * carries captured_by / verification instead.
 */

/**
 * Which source to use, by writer (business-rules §4):
 *
 *   officer registering or editing a record   field_verified
 *   a number the farmer supplied, typed by
 *     anyone                                  farmer_reported
 *   a farmer editing their own profile        farmer_reported
 *   a PUE request                             farmer_reported (schema default)
 *   an energy estimate                        model_estimated (trigger sets it)
 *   meter data                                sensor_derived  — NOT IN MVP
 *   a recorded transaction                    transaction_derived — NOT IN MVP
 *
 * Nothing in the MVP writes sensor_derived or transaction_derived.
 */

/**
 * Injects `source`, `captured_at` and `captured_by` into an observed-table
 * insert.
 *
 * `captured_by` is the caller's app_user.id, which is auth.uid(). Never
 * accepted as an argument: a client that can assert who captured a record can
 * launder provenance.
 *
 * `verification` is deliberately NOT set here. It stays at its column default
 * of 'unverified' and only ever changes through app_verify(), so a record
 * cannot be marked verified without a verifier.
 */
export function withProvenance<T extends object>(
  _payload: T,
  _source: SourceType,
): T & { source: SourceType; captured_at: string; captured_by: string } {
  // TODO(tier 1): read the session's app_user.id, stamp captured_at as an ISO
  // timestamptz, and return the merged payload.
  throw new Error('withProvenance is not implemented yet')
}
