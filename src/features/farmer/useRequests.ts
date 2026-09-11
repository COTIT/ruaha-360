import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { FARMER_ACTION_TARGET, type FarmerAction } from '@/features/ops/transitions'
import { supabase } from '@/lib/supabase'
import { queryKeys, isTowerQueryForVillage } from '@/lib/queryKeys'
import type { Database } from '@/lib/db.types'

type RequestRow = Database['public']['Tables']['pue_request']['Row']
type EstimateRow = Database['public']['Tables']['energy_estimate']['Row']

const SELECT = `id, village_id, person_id, farm_id, equipment_id, quantity, hours_per_day,
  days_per_week, purpose, status, submitted_at, decided_at, decision_note,
  source, verification, confidence, captured_at,
  equipment ( id, name_en, name_sw, rated_power_kw, indicative_price, currency ),
  energy_estimate ( id, rated_power_kw, quantity, hours_per_day, days_per_week,
    est_power_kw, est_kwh_per_day, est_kwh_per_week, method, computed_at )`

export interface FarmerRequest extends RequestRow {
  equipment_name: string
  equipment: { rated_power_kw: number | null; indicative_price: number | null; currency: string } | null
  estimate: EstimateRow | null
}

function localise(row: Record<string, unknown>, sw: boolean): FarmerRequest {
  const equipment = row.equipment as
    | { name_en: string; name_sw: string; rated_power_kw: number | null; indicative_price: number | null; currency: string }
    | null
  // energy_estimate is one-to-one via a unique FK, but PostgREST returns an
  // array for an embedded child table.
  const estimates = row.energy_estimate as EstimateRow[] | EstimateRow | null
  const estimate = Array.isArray(estimates) ? (estimates[0] ?? null) : (estimates ?? null)

  return {
    ...(row as unknown as RequestRow),
    equipment_name: equipment ? (sw ? equipment.name_sw : equipment.name_en) : '',
    equipment: equipment
      ? {
          rated_power_kw: equipment.rated_power_kw,
          indicative_price: equipment.indicative_price,
          currency: equipment.currency,
        }
      : null,
    estimate,
  }
}

/**
 * The farmer's own requests. pue_read_own scopes to person_id =
 * app_person_id(), so no filter is needed — and adding one would imply the
 * client is what keeps other farmers' requests out.
 */
export function useMyRequests() {
  const { i18n } = useTranslation()
  const sw = i18n.resolvedLanguage === 'sw'

  const query = useQuery({
    queryKey: queryKeys.requests({}),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pue_request')
        .select(SELECT)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as unknown as Array<Record<string, unknown>>
    },
  })

  return { ...query, requests: (query.data ?? []).map((r) => localise(r, sw)) }
}

export function useRequest(requestId: string) {
  const { i18n } = useTranslation()
  const sw = i18n.resolvedLanguage === 'sw'

  const query = useQuery({
    queryKey: queryKeys.request(requestId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pue_request')
        .select(SELECT)
        .eq('id', requestId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data as unknown as Record<string, unknown>) ?? null
    },
  })

  return { ...query, request: query.data ? localise(query.data, sw) : null }
}

export interface NewRequest {
  villageId: string
  personId: string
  equipmentId: string
  quantity: number
  hoursPerDay: number
  daysPerWeek: number
  purpose: string
}

/**
 * Submits a request straight to 'submitted' — spec 6.4.
 *
 * The guard allows only 'draft' or 'submitted' on insert and stamps
 * submitted_at itself. `source` is left to its column default of
 * farmer_reported, and the estimate is written by pue_recompute_estimate:
 * clients hold no write policy on energy_estimate at all, so the stored figure
 * can never be fabricated here.
 */
export function useSubmitRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: NewRequest) => {
      const { data, error } = await supabase
        .from('pue_request')
        .insert({
          village_id: input.villageId,
          person_id: input.personId,
          equipment_id: input.equipmentId,
          quantity: input.quantity,
          hours_per_day: input.hoursPerDay,
          days_per_week: input.daysPerWeek,
          purpose: input.purpose || null,
          status: 'submitted',
        })
        .select('id')
        .single()

      // Guard messages are written to be read by humans; surfaced verbatim.
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: async (_data, input) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.requests({}) })
      await queryClient.invalidateQueries({ predicate: isTowerQueryForVillage(input.villageId) })
    },
  })
}

/**
 * The applicant's own transitions — submit a draft, or withdraw.
 *
 * Sends ONLY `status`. `submitted_at`, `decided_at` and `decided_by` are
 * stamped by `pue_request_guard`, and business-rules §2 is explicit that the
 * client must never send them — if it does, the trigger overwrites them
 * anyway, so sending them would only invite a disagreement.
 *
 * Which actions are offered is decided by `farmerActions`, mirroring the
 * guard's machine. The guard remains the enforcement: a refusal is shown as
 * written rather than pre-empted.
 */
export function useFarmerTransition(requestId: string, villageId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (action: FarmerAction) => {
      const { error } = await supabase
        .from('pue_request')
        .update({ status: FARMER_ACTION_TARGET[action] })
        .eq('id', requestId)

      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.request(requestId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.requests({}) })
      // Submitting moves the village's PROSPECTIVE peak, and withdrawing
      // moves it back — both change v_village_energy.
      if (villageId) {
        await queryClient.invalidateQueries({ predicate: isTowerQueryForVillage(villageId) })
      }
      // The ops pipeline and its home counter both list this request.
      await queryClient.invalidateQueries({ queryKey: ['opsHome'] })
    },
  })
}
