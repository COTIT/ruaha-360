const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The Tower reports on one village at a time, and which village lives in the
 * URL so a view is shareable and reloadable.
 *
 * Validated at the point of use as well as on the route: the router hands back
 * raw search params, and a non-uuid reaches PostgREST as invalid input for a
 * uuid column rather than as "no village".
 */
export function validateVillageSearch(search: Record<string, unknown>): { village?: string } {
  const village = search.village
  return typeof village === 'string' && UUID.test(village) ? { village } : {}
}
