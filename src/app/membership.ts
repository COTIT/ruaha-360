import type { Database } from '@/lib/db.types'

type MembershipRow = Database['public']['Tables']['membership']['Row']
export type AppRole = Database['public']['Enums']['app_role']

/** The subset of a membership row the routing decision needs. */
export type ActiveMembership = Pick<
  MembershipRow,
  'id' | 'role' | 'project_id' | 'village_id' | 'revoked_at'
>

/**
 * Where a role starts.
 *
 * `admin` has no surface of its own: CLAUDE.md calls it operational (seed,
 * support), the route map has no /admin, and the role matrix gives it the same
 * whole-project scope as ops. So it lands on the ops surface.
 */
export function roleHome(role: AppRole): string {
  switch (role) {
    case 'farmer':
      return '/farm'
    case 'field_officer':
      return '/officer'
    case 'ops':
    case 'admin':
      return '/ops'
  }
}

/**
 * Access ends, the audit trail does not — membership is revoked, never
 * deleted, so every read has to filter.
 */
export function activeMemberships(rows: ActiveMembership[]): ActiveMembership[] {
  return rows.filter((r) => r.revoked_at === null)
}

/**
 * Spec 4.2: 0 rows -> /no-access, 1 row -> that role's home, 2+ -> the picker.
 *
 * Route guards are UX, not security. This decides where to *send* someone;
 * what they can see once there is RLS's business.
 */
export function resolveLanding(rows: ActiveMembership[]): { to: string } {
  const active = activeMemberships(rows)
  if (active.length === 0) return { to: '/no-access' }
  if (active.length === 1) return { to: roleHome(active[0].role) }
  return { to: '/select-role' }
}
