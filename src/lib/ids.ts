/**
 * Route params are strings until something says otherwise — QA #3.
 *
 * Every `$id` route took its param straight into a query, so
 * `/officer/people/not-a-uuid` came back as
 * `invalid input syntax for type uuid: "not-a-uuid"`. A well-formed id that
 * matches nothing already behaves properly — RLS returns zero rows and the
 * screen says "not found" — so the fix is to recognise a malformed one before
 * the query and let it reach that same state, rather than translating the
 * parse failure afterwards.
 *
 * Search params were already handled this way (`/ops/tower?village=nonsense`
 * renders the village prompt); this brings params into line.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID.test(value)
}
