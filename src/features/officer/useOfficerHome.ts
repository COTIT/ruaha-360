import { useQuery } from '@tanstack/react-query'

import { useScopeNames } from '@/app/scope'
import { useSession } from '@/app/session'
import { writableVillageIds } from '@/app/membership'
import { queryKeys } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'

export interface OfficerVillage {
  villageId: string
  villageName: string
  persons: number
  farms: number
  requests: number
  unverified: number
}

/**
 * The five tables `app_verify` accepts (business-rules §5). The officer home's
 * "records still needing verification" figure spans all of them, because the
 * verify queue does too — a count that only covered `person` would send an
 * officer to a queue longer than the number they were shown.
 */
const VERIFIABLE = ['person', 'farm', 'plot', 'crop_cycle', 'harvest_report'] as const
type VerifiableTable = (typeof VERIFIABLE)[number]

/**
 * Counts are asked of the database, never derived from fetched rows.
 *
 * `head: true` sends no rows back at all — business-rules §11 forbids the
 * client computing village aggregates, and counting a page of results would be
 * both that and wrong the moment a result set is truncated.
 */
async function countVerifiable(
  table: VerifiableTable,
  villageId: string,
  unverifiedOnly: boolean,
): Promise<number> {
  const base = supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('village_id', villageId)
    .is('deleted_at', null)

  const { count, error } = await (unverifiedOnly
    ? base.eq('verification', 'unverified')
    : base)

  // A failed count is not zero. Reporting "0 records need verifying" because a
  // query broke would tell an officer their work is done when it is not.
  if (error) throw new Error(error.message)
  return count ?? 0
}

async function countRequests(villageId: string): Promise<number> {
  const { count, error } = await supabase
    .from('pue_request')
    .select('*', { count: 'exact', head: true })
    .eq('village_id', villageId)
    .is('deleted_at', null)

  if (error) throw new Error(error.message)
  return count ?? 0
}

/**
 * Per-village figures for the officer's home — spec 5.1.
 *
 * RLS scopes every count to what this officer may see, so the village ids only
 * decide which buckets to ask for, never what is permitted.
 */
export async function fetchOfficerHome(
  villageIds: string[],
): Promise<Array<Omit<OfficerVillage, 'villageName'>>> {
  return Promise.all(
    villageIds.map(async (villageId) => {
      const [persons, farms, requests, ...unverifiedPerTable] = await Promise.all([
        countVerifiable('person', villageId, false),
        countVerifiable('farm', villageId, false),
        countRequests(villageId),
        ...VERIFIABLE.map((t) => countVerifiable(t, villageId, true)),
      ])

      return {
        villageId,
        persons,
        farms,
        requests,
        // A total of exact counts the database returned, not a re-derivation
        // of a view figure. `v_village_data_quality` reports verified shares
        // per table but has no cross-table outstanding total.
        unverified: unverifiedPerTable.reduce((sum, n) => sum + n, 0),
      }
    }),
  )
}

/**
 * Spec 5.1 — assigned villages, their record counts, and what still needs
 * verifying.
 *
 * `writableVillageIds` is the right scope rather than the `village` table:
 * village rows are readable by any signed-in user (they are not personal
 * data), so selecting from them would list villages this officer is not
 * assigned to. The membership is what "assigned" means.
 */
export function useOfficerHome() {
  const { data: session } = useSession()
  const villageIds = writableVillageIds(session?.memberships ?? [])
  const scope = useScopeNames()

  const query = useQuery({
    queryKey: queryKeys.officerHome(villageIds),
    queryFn: () => fetchOfficerHome(villageIds),
    // No villages means nothing to count. Firing the query would return an
    // empty array and read as "loaded and empty", which is the same answer by
    // a slower route.
    enabled: villageIds.length > 0,
  })

  const villages: OfficerVillage[] = (query.data ?? []).map((row) => ({
    ...row,
    villageName: scope.data?.villages[row.villageId] ?? row.villageId,
  }))

  return {
    ...query,
    // Zero assigned villages is a legitimate state (spec 5.1), and with the
    // query disabled it would otherwise report `isLoading` forever.
    isLoading: villageIds.length > 0 && (query.isLoading || scope.isLoading),
    error: query.error ?? scope.error,
    villages,
  }
}
