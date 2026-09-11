import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { queryKeys } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/db.types'

type Enums = Database['public']['Enums']

interface Provenance {
  source: Enums['source_type']
  verification: Enums['verification_status']
  confidence: Enums['confidence_level'] | null
  captured_at: string
}

export interface FarmDetail extends Provenance {
  id: string
  label: string
  village_id: string
  latitude: number | null
  longitude: number | null
  plots: Array<Provenance & { id: string; label: string; area_ha: number | null }>
}

export interface CycleHarvest extends Provenance {
  id: string
  kind: Enums['harvest_kind']
  quantity_kg: number
  reported_for: string | null
  is_current: boolean
}

export interface CycleDetail extends Provenance {
  id: string
  village_id: string
  crop_name: string
  season_label: string | null
  status: Enums['crop_cycle_status']
  area_ha: number | null
  tree_count: number | null
  unit_count: number | null
  planted_on: string | null
  harvest_start: string | null
  harvest_end: string | null
  plot_label: string | null
  harvests: CycleHarvest[]
}

const PROVENANCE = 'source, verification, confidence, captured_at'

/**
 * Farm detail — spec 5.5, READ-ONLY for the demo.
 *
 * Add-plot and GpsCapture are deferred: the screen exists first because the
 * Tower's production drill links here, and a headline that dead-ends on a
 * placeholder breaks spec §8.2's traceability claim.
 *
 * The plot embed names its foreign key. village_id is denormalised down
 * farm → plot and held true by a composite FK, so the pair has two
 * relationships and PostgREST refuses to choose between them.
 */
export async function fetchFarmDetail(farmId: string): Promise<FarmDetail | null> {
  const { data, error } = await supabase
    .from('farm')
    .select(
      `id, label, village_id, latitude, longitude, ${PROVENANCE},
       plot!plot_farm_id_fkey ( id, label, area_ha, ${PROVENANCE} )`,
    )
    .eq('id', farmId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const raw = data as unknown as Record<string, unknown>
  return {
    ...(raw as unknown as FarmDetail),
    plots: (raw.plot ?? []) as FarmDetail['plots'],
  }
}

export function useFarmDetail(farmId: string) {
  return useQuery({
    queryKey: queryKeys.farm(farmId),
    queryFn: () => fetchFarmDetail(farmId),
  })
}

/**
 * Crop cycle detail with its harvest series — spec 5.6, READ-ONLY.
 *
 * A harvest figure is a SERIES, not a value (business-rules §6): superseded
 * rows stay auditable and are shown, labelled, beside the current one. Adding
 * a revision goes through `app_supersede_harvest` and is deferred with the
 * other officer writes.
 */
export async function fetchCycleDetail(cycleId: string, sw: boolean): Promise<CycleDetail | null> {
  const { data, error } = await supabase
    .from('crop_cycle')
    .select(
      `id, village_id, season_label, status, area_ha, tree_count, unit_count,
       planted_on, harvest_start, harvest_end, ${PROVENANCE},
       crop ( name_en, name_sw ),
       plot!crop_cycle_plot_id_fkey ( label ),
       harvest_report!harvest_report_crop_cycle_id_fkey (
         id, kind, quantity_kg, reported_for, is_current, ${PROVENANCE} )`,
    )
    .eq('id', cycleId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const raw = data as unknown as Record<string, unknown>
  const crop = raw.crop as { name_en: string; name_sw: string } | null
  const plot = raw.plot as { label: string } | null
  const harvests = ((raw.harvest_report ?? []) as CycleHarvest[])
    // Current first, then most recently reported — the figure in force leads,
    // and the ones it replaced follow in the order they were superseded.
    .slice()
    .sort((a, b) => {
      if (a.is_current !== b.is_current) return a.is_current ? -1 : 1
      return (b.reported_for ?? '').localeCompare(a.reported_for ?? '')
    })

  return {
    ...(raw as unknown as CycleDetail),
    crop_name: crop ? (sw ? crop.name_sw : crop.name_en) : '',
    plot_label: plot?.label ?? null,
    harvests,
  }
}

export function useCycleDetail(cycleId: string) {
  const { i18n } = useTranslation()
  const sw = i18n.resolvedLanguage === 'sw'

  return useQuery({
    queryKey: queryKeys.cycle(cycleId),
    queryFn: () => fetchCycleDetail(cycleId, sw),
  })
}
