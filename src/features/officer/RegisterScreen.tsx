import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'

import { activeMemberships, writableVillageIds } from '@/app/membership'
import { useSession } from '@/app/session'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { UnsavedDraftBadge } from '@/components/UnsavedDraftBadge'
import { buildRegisterPayload, type RegisterForm } from '@/features/officer/registerPayload'
import {
  registerSchema,
  roundedTo,
  type CropMeasure,
} from '@/features/officer/registerSchema'
import { useCrops } from '@/features/officer/useCrops'
import { draftKey, useDraft } from '@/lib/drafts'
import { queryKeys, isTowerQueryForVillage } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/lib/db.types'

/** What app_register_farmer returns. */
interface RegisterResult {
  person_id: string | null
  household_id: string | null
  farm_id: string | null
  plot_id: string | null
  crop_cycle_id: string | null
  harvest_report_id: string | null
  replayed: boolean
}

const EMPTY: RegisterForm = {
  given_name: '',
  family_name: '',
  phone: '',
  household_label: '',
  is_head: true,
  farm_label: '',
  farm_latitude: '',
  farm_longitude: '',
  plot_label: '',
  plot_area_ha: '',
  crop_id: '',
  season_label: '',
  cycle_area_ha: '',
  cycle_tree_count: '',
  cycle_unit_count: '',
  planted_on: '',
  harvest_start: '',
  harvest_end: '',
  harvest_quantity_kg: '',
  confidence: 'medium',
}

// By route id rather than by importing the route, which would be circular.
const route = getRouteApi('/_officer/officer/register')

/** One draft id per form instance, so a retry cannot create a second farmer. */
function newClientRef() {
  return crypto.randomUUID()
}

/**
 * Spec 5.2 — one page, one submit, one RPC.
 *
 * Not five chained client inserts: a phone that loses signal mid-chain leaves
 * orphan rows across five tables. app_register_farmer does the whole thing in
 * one transaction and is idempotent on client_ref, so a retry after a timeout
 * cannot create a second farmer.
 */
export function RegisterScreen() {
  const { t } = useTranslation()
  const session = useSession()
  const cropsQuery = useCrops()
  const queryClient = useQueryClient()

  // The draft id is URL-held: a reload must find the same draft, and it also
  // becomes the RPC's client_ref, so a retry after a timeout replays rather
  // than creating a second farmer.
  const { draft: draftIdFromUrl } = route.useSearch()
  const navigate = useNavigate()

  useEffect(() => {
    if (draftIdFromUrl) return
    void navigate({
      to: '/officer/register',
      search: { draft: newClientRef() },
      replace: true,
    })
  }, [draftIdFromUrl, navigate])

  const clientRef = draftIdFromUrl ?? ''
  const draft = useDraft<RegisterForm>(draftKey('register', clientRef))

  // The mandatory measure field depends on the CROP CHOSEN, so the schema has
  // to be built at validation time rather than captured once at mount. A ref
  // holds the current measure and the resolver reads it on each submit; a
  // resolver passed directly would freeze the crop that was selected when the
  // form first rendered.
  const measureRef = useRef<CropMeasure | undefined>(undefined)
  const resolver = useMemo<Resolver<RegisterForm, unknown, RegisterForm>>(
    () => (values, context, options) =>
      zodResolver(registerSchema(measureRef.current))(values, context, options),
    [],
  )

  const { register, handleSubmit, watch, reset, formState } = useForm<
    RegisterForm,
    unknown,
    RegisterForm
  >({
    defaultValues: EMPTY,
    resolver,
  })

  // Restore once the stored draft arrives. Without this the form would render
  // empty and then repopulate, which reads as data loss.
  const [restored, setRestored] = useState(false)
  useEffect(() => {
    if (restored) return
    if (draft.status === 'restoring') return
    if (draft.draft) reset(draft.draft)
    setRestored(true)
  }, [draft.status, draft.draft, reset, restored])

  // Only the crop drives rendering, so only it is subscribed for render.
  const cropId = watch('crop_id')

  // Autosave on change, via react-hook-form's own subscription rather than an
  // effect over stringified values. Local only — the badge stays up until the
  // RPC returns, because reaching IndexedDB is not a server write.
  const save = draft.save
  useEffect(() => {
    if (!restored) return
    // react-hooks/incompatible-library does not model react-hook-form's
    // subscription API, which returns an unsubscribe handle rather than
    // mutating state. The subscription is torn down below, so the effect is
    // correctly scoped.
    // eslint-disable-next-line react-hooks/incompatible-library
    const subscription = watch((value) => {
      const dirty = Object.entries(value).some(
        ([key, v]) => v !== EMPTY[key as keyof RegisterForm],
      )
      if (dirty) void save(value as RegisterForm)
    })
    return () => subscription.unsubscribe()
  }, [watch, save, restored])

  const villageIds = writableVillageIds(activeMemberships(session.data?.memberships ?? []))
  const villageId = villageIds[0]

  const measure = useMemo(
    () => cropsQuery.crops.find((c) => c.id === cropId)?.measured_by,
    [cropsQuery.crops, cropId],
  )
  measureRef.current = measure

  // The two hectares fields and the harvest figure, watched only so the form
  // can say what a column's scale will do to what was typed (QA #27).
  const plotArea = watch('plot_area_ha')
  const cycleArea = watch('cycle_area_ha')
  const harvestKg = watch('harvest_quantity_kg')

  const submit = useMutation({
    mutationFn: async (form: RegisterForm) => {
      if (!villageId) throw new Error(t('register.noVillage'))
      if (!measure) throw new Error(t('register.required'))

      const payload = buildRegisterPayload(form, { clientRef, villageId, measure })
      // The generated signature types the argument as Json, which is a
      // recursive index-signature type an interface cannot satisfy. The shape
      // itself is asserted by registerPayload.test.ts.
      const { data, error } = await supabase.rpc('app_register_farmer', {
        payload: payload as unknown as Json,
      })
      // Trigger and RPC messages are written to be read by humans; surfaced
      // verbatim rather than replaced with a generic failure.
      if (error) throw new Error(error.message)
      // The RPC returns the ids it created, plus `replayed` when a retry hit
      // the idempotency receipt rather than creating a second farmer.
      return data as unknown as RegisterResult
    },
    onSuccess: async () => {
      // Cleared ONLY after the RPC returned success.
      await draft.clear()
      await queryClient.invalidateQueries({ queryKey: queryKeys.people(villageId ?? '') })
      await queryClient.invalidateQueries({ queryKey: queryKeys.farms(villageId ?? '') })
      await queryClient.invalidateQueries({ predicate: isTowerQueryForVillage(villageId ?? '') })
    },
  })

  if (session.error) return <ErrorState error={session.error} />
  if (cropsQuery.error) return <ErrorState error={cropsQuery.error} />

  if (!draftIdFromUrl || session.isLoading || cropsQuery.isLoading || draft.status === 'restoring') {
    return (
      <p data-testid="register-loading" className="text-sm text-deep/60">
        {t('common.loading')}
      </p>
    )
  }

  // An officer with no village assignment cannot register anyone. Say so
  // rather than letting the RPC refuse after a full form is typed.
  if (!villageId) {
    return <EmptyState title={t('register.noVillage')} detail={t('register.noVillageDetail')} />
  }

  if (submit.isSuccess) {
    const created = submit.data
    return (
      <section className="space-y-3" data-testid="register-success">
        <h1 className="text-lg font-semibold">{t('register.successTitle')}</h1>
        <p className="text-sm text-deep/70">{t('register.successDetail')}</p>
        {created?.person_id && (
          <Link
            to="/officer/people/$personId"
            params={{ personId: created.person_id }}
            data-testid="register-view-person"
            className="inline-block text-sm font-medium text-primary underline underline-offset-4"
          >
            {t('register.viewPerson')}
          </Link>
        )}
        <button
          type="button"
          data-testid="register-another"
          className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => {
            reset(EMPTY)
            setRestored(true)
            submit.reset()
            // A fresh client_ref, so the next registration is a new one rather
            // than an idempotent replay of the one just completed.
            void navigate({
              to: '/officer/register',
              search: { draft: newClientRef() },
              replace: true,
            })
          }}
        >
          {t('register.registerAnother')}
        </button>
      </section>
    )
  }

  /**
   * One message per reason, not one message per form.
   *
   * The schema puts an i18n KEY in `message`, the way `LoginScreen` does, so
   * this resolves it at render. `register.required` is the fallback for an
   * error react-hook-form raised itself, which carries no message.
   */
  const err = (name: keyof RegisterForm) => {
    const message = formState.errors[name]?.message
    if (!formState.errors[name]) return null
    return (
      <p data-testid={`register-${fieldId(name)}-error`} className="text-sm text-destructive">
        {t(message ?? 'register.required')}
      </p>
    )
  }

  /** What a column's scale will store, when that is not what was typed. */
  const rounded = (testId: string, value: string | undefined, dp: number) => {
    const stored = roundedTo(value ?? '', dp)
    if (!stored) return null
    return (
      <p data-testid={`${testId}-rounded`} className="text-xs text-deep/60">
        {t('register.roundedNote', { value: stored })}
      </p>
    )
  }

  return (
    <section className="max-w-xl space-y-5">
      <header className="space-y-2">
        <h1 className="text-lg font-semibold">{t('register.title')}</h1>
        <p className="text-sm text-deep/70">{t('register.intro')}</p>
        {/* Provenance is never a user-facing choice on this screen. */}
        <p className="text-xs text-deep/50">{t('register.provenanceNote')}</p>
        {draft.status === 'dirty' && <UnsavedDraftBadge />}
      </header>

      <form
        className="space-y-6"
        noValidate
        onSubmit={handleSubmit((form) => submit.mutate(form))}
      >
        <Fieldset legend={t('register.sections.person')}>
          <Field label={t('register.givenName')} id="register-given-name">
            <input
              id="register-given-name"
              data-testid="register-given-name"
              className={inputClass}
              {...register('given_name')}
            />
          </Field>
          {err('given_name')}
          <Field label={t('register.familyName')} id="register-family-name">
            <input
              id="register-family-name"
              data-testid="register-family-name"
              className={inputClass}
              {...register('family_name')}
            />
          </Field>
          {err('family_name')}
          <Field label={t('register.phone')} id="register-phone">
            <input
              id="register-phone"
              data-testid="register-phone"
              className={inputClass}
              {...register('phone')}
            />
          </Field>
          {/* `person.phone` is free text by design — the seed uses +255… and
              there is no rule to enforce, so a hint is the whole fix. #28. */}
          <p data-testid="register-phone-hint" className="text-xs text-deep/60">
            {t('register.phoneHint')}
          </p>
        </Fieldset>

        <Fieldset legend={t('register.sections.household')}>
          <Field label={t('register.householdLabel')} id="register-household-label">
            <input
              id="register-household-label"
              data-testid="register-household-label"
              className={inputClass}
              {...register('household_label')}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" data-testid="register-is-head" {...register('is_head')} />
            {t('register.isHead')}
          </label>
        </Fieldset>

        <Fieldset legend={t('register.sections.farm')}>
          <Field label={t('register.farmLabel')} id="register-farm-label">
            <input
              id="register-farm-label"
              data-testid="register-farm-label"
              className={inputClass}
              {...register('farm_label')}
            />
          </Field>
          {err('farm_label')}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('register.latitude')} id="register-farm-latitude">
              <input
                id="register-farm-latitude"
                data-testid="register-farm-latitude"
                className={inputClass}
                {...register('farm_latitude')}
              />
              {err('farm_latitude')}
            </Field>
            <Field label={t('register.longitude')} id="register-farm-longitude">
              <input
                id="register-farm-longitude"
                data-testid="register-farm-longitude"
                className={inputClass}
                {...register('farm_longitude')}
              />
              {err('farm_longitude')}
            </Field>
          </div>
        </Fieldset>

        <Fieldset legend={t('register.sections.plot')}>
          <Field label={t('register.plotLabel')} id="register-plot-label">
            <input
              id="register-plot-label"
              data-testid="register-plot-label"
              className={inputClass}
              {...register('plot_label')}
            />
          </Field>
          {err('plot_label')}
          <Field label={t('register.plotArea')} id="register-plot-area">
            <input
              id="register-plot-area"
              data-testid="register-plot-area"
              inputMode="decimal"
              className={inputClass}
              {...register('plot_area_ha')}
            />
          </Field>
          {err('plot_area_ha')}
          {rounded('register-plot-area', plotArea, 4)}
        </Fieldset>

        <Fieldset legend={t('register.sections.cycle')}>
          <Field label={t('register.crop')} id="register-crop">
            <select
              id="register-crop"
              data-testid="register-crop"
              className={inputClass}
              {...register('crop_id')}
            >
              <option value="">{t('register.chooseCrop')}</option>
              {cropsQuery.crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          {err('crop_id')}

          {/* Branches on crop.measured_by: the RPC rejects the wrong measure,
              so only the right field is offered. */}
          {measure === 'area' && (
            <Field label={t('register.cycleArea')} id="register-cycle-area">
              <input
                id="register-cycle-area"
                data-testid="register-cycle-area"
                inputMode="decimal"
                className={inputClass}
                {...register('cycle_area_ha')}
              />
              {err('cycle_area_ha')}
              {rounded('register-cycle-area', cycleArea, 4)}
            </Field>
          )}
          {measure === 'tree_count' && (
            <Field label={t('register.treeCount')} id="register-cycle-tree-count">
              <input
                id="register-cycle-tree-count"
                data-testid="register-cycle-tree-count"
                inputMode="numeric"
                className={inputClass}
                {...register('cycle_tree_count')}
              />
              {err('cycle_tree_count')}
            </Field>
          )}
          {measure === 'unit_count' && (
            <Field label={t('register.unitCount')} id="register-cycle-unit-count">
              <input
                id="register-cycle-unit-count"
                data-testid="register-cycle-unit-count"
                inputMode="numeric"
                className={inputClass}
                {...register('cycle_unit_count')}
              />
              {err('cycle_unit_count')}
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('register.harvestStart')} id="register-harvest-start">
              <input
                id="register-harvest-start"
                data-testid="register-harvest-start"
                type="date"
                className={inputClass}
                {...register('harvest_start')}
              />
              {err('harvest_start')}
            </Field>
            <Field label={t('register.harvestEnd')} id="register-harvest-end">
              <input
                id="register-harvest-end"
                data-testid="register-harvest-end"
                type="date"
                className={inputClass}
                {...register('harvest_end')}
              />
              {err('harvest_end')}
            </Field>
          </div>
        </Fieldset>

        <Fieldset legend={t('register.sections.harvest')}>
          <Field label={t('register.harvestKg')} id="register-harvest-kg">
            <input
              id="register-harvest-kg"
              data-testid="register-harvest-kg"
              inputMode="decimal"
              className={inputClass}
              {...register('harvest_quantity_kg')}
            />
          </Field>
          {err('harvest_quantity_kg')}
          {rounded('register-harvest-kg', harvestKg, 2)}
          <Field label={t('register.confidence')} id="register-confidence">
            <select
              id="register-confidence"
              data-testid="register-confidence"
              className={inputClass}
              {...register('confidence')}
            >
              <option value="low">{t('confidence.low')}</option>
              <option value="medium">{t('confidence.medium')}</option>
              <option value="high">{t('confidence.high')}</option>
            </select>
          </Field>
        </Fieldset>

        {submit.isError && (
          <div data-testid="register-error">
            <ErrorState error={submit.error} onRetry={() => submit.reset()} />
          </div>
        )}

        <button
          type="submit"
          data-testid="register-submit"
          disabled={submit.isPending}
          className="w-full rounded bg-primary px-3 py-2.5 font-medium text-primary-foreground disabled:opacity-60"
        >
          {submit.isPending ? t('register.submitting') : t('register.submit')}
        </button>
      </form>
    </section>
  )
}

const inputClass = 'w-full rounded border border-deep/20 bg-white px-3 py-2'

function fieldId(name: keyof RegisterForm) {
  return name.replace(/_/g, '-')
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded border border-deep/10 bg-white/60 p-4">
      <legend className="px-1 text-sm font-semibold">{legend}</legend>
      {children}
    </fieldset>
  )
}

function Field({
  label,
  id,
  children,
}: {
  label: string
  id: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  )
}
