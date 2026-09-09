/**
 * The query-key registry from business-rules §10.
 *
 * Not a stub: there is nothing to implement here, only the agreed shape. Every
 * `useQuery` takes its key from this file so that the invalidation map below
 * stays mechanical rather than remembered.
 *
 * Mutations invalidate the NARROWEST key that covers the change.
 *
 * Invalidation map (business-rules §10):
 *
 *   app_register_farmer      people(village), farms(village), tower.all(village)
 *   app_verify               the record key, tower.quality(village),
 *                            and the farmer-facing key for that record
 *   request insert / update  requests(...), request(id), estimate(id),
 *                            tower.energy(village)
 *   approve / reject         as above, plus the farmer's request(id)
 *   app_supersede_harvest    harvest(cycle), tower.production(village),
 *                            tower.market(village)
 *   opportunity_supply write opportunity(id), demand(demandId),
 *                            tower.market(village)
 */
export const queryKeys = {
  session: () => ['session'] as const,
  villages: () => ['villages'] as const,

  person: (personId: string) => ['person', personId] as const,
  people: (villageId: string, filters?: unknown) =>
    ['people', villageId, filters] as const,

  farm: (farmId: string) => ['farm', farmId] as const,
  farms: (villageId: string) => ['farms', villageId] as const,

  cycle: (cycleId: string) => ['cycle', cycleId] as const,
  harvest: (cycleId: string) => ['harvest', cycleId] as const,

  equipment: (projectId: string) => ['equipment', projectId] as const,
  equipmentItem: (equipmentId: string) => ['equipmentItem', equipmentId] as const,

  requests: (filters: { villageId?: string; status?: string }) =>
    ['requests', filters] as const,
  request: (requestId: string) => ['request', requestId] as const,
  estimate: (requestId: string) => ['estimate', requestId] as const,

  demand: (demandId: string) => ['demand', demandId] as const,
  demands: (projectId: string) => ['demands', projectId] as const,
  opportunity: (opportunityId: string) => ['opportunity', opportunityId] as const,

  tower: {
    production: (villageId: string) => ['tower', 'production', villageId] as const,
    energy: (villageId: string) => ['tower', 'energy', villageId] as const,
    market: (villageId: string) => ['tower', 'market', villageId] as const,
    quality: (villageId: string) => ['tower', 'quality', villageId] as const,
  },
} as const

/**
 * `['tower', *, village]` in the invalidation map is a WILDCARD IN THE MIDDLE,
 * so it cannot be expressed as a key prefix: the village is the third element,
 * and `['tower', villageId]` matches nothing. Use a predicate.
 *
 *   queryClient.invalidateQueries({ predicate: isTowerQueryForVillage(v) })
 */
export function isTowerQueryForVillage(villageId: string) {
  return (query: { queryKey: readonly unknown[] }) =>
    query.queryKey[0] === 'tower' && query.queryKey[2] === villageId
}
