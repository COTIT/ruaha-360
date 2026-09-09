import { useQuery, type QueryClient } from '@tanstack/react-query'

import type { ActiveMembership } from '@/app/membership'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Database } from '@/lib/db.types'

type AppUserRow = Database['public']['Tables']['app_user']['Row']

export interface AppSession {
  userId: string
  email: string | null
  appUser: Pick<AppUserRow, 'id' | 'person_id' | 'display_name' | 'locale'> | null
  memberships: ActiveMembership[]
}

/**
 * auth user -> app_user -> the caller's own active memberships (spec §13).
 *
 * Returns null when signed out. That is an answer, not an error.
 */
export async function fetchSession(): Promise<AppSession | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return null

  const userId = session.user.id

  const [appUserResult, membershipResult] = await Promise.all([
    supabase
      .from('app_user')
      .select('id, person_id, display_name, locale')
      .eq('id', userId)
      .maybeSingle(),
    // `user_id` MUST be filtered here. membership carries two read policies:
    // membership_read_self and membership_read_managers, and the second lets
    // an ops user read every membership in the project. Without this filter an
    // ops login would see six rows, and resolveLanding would send them to the
    // role picker instead of their own surface.
    supabase
      .from('membership')
      .select('id, role, project_id, village_id, revoked_at')
      .eq('user_id', userId)
      .is('revoked_at', null),
  ])

  return {
    userId,
    email: session.user.email ?? null,
    appUser: appUserResult.data ?? null,
    memberships: membershipResult.data ?? [],
  }
}

export const sessionQuery = {
  queryKey: queryKeys.session(),
  queryFn: fetchSession,
  // A revoked membership takes effect on the next query; RLS re-evaluates
  // every statement, so no session invalidation is needed.
  staleTime: 0,
}

export function useSession() {
  return useQuery(sessionQuery)
}

/** For router beforeLoad, which runs outside React. */
export function ensureSession(queryClient: QueryClient) {
  return queryClient.ensureQueryData(sessionQuery)
}

export async function signOut(queryClient: QueryClient) {
  await supabase.auth.signOut()
  await queryClient.invalidateQueries({ queryKey: queryKeys.session() })
}
