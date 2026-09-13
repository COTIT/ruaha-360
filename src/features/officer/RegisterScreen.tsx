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
import { BangMark, HatchMark, VerificationMark } from '@/components/marks'
import { buildRegisterPayload, type RegisterForm } from '@/features/officer/registerPayload'
import {
  isRegisterDraft,
  registerSchema,
  roundedTo,
  type CropMeasure,
} from '@/features/officer/registerSchema'
import {
  REGISTER_GROUPS,
  isGroupComplete,
  type RegisterGroup,
} from '@/features/officer/registerProgress'
import { useCrops } from '@/features/officer/useCrops'
import { draftKey, indexedDbDraftStore, useDraft } from '@/lib/drafts'
import { newUuid } from '@/lib/ids'
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
  return newUuid()
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
  /**
   * The shape guard is what stops QA #22: a draft written by an OLDER
   * deployment of this form restored verbatim, rendering `[object Object]` as
   * a farmer's first name and standing ready to submit it.
   */
  const draft = useDraft<RegisterForm>(
    draftKey('register', clientRef),
    indexedDbDraftStore,
    isRegisterDraft,
  )

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

  const crop = useMemo(
    () => cropsQuery.crops.find((c) => c.id === cropId),
    [cropsQuery.crops, cropId],
  )
  const measure = crop?.measured_by
  // Named, so the branch says which crop decided it rather than silently
  // swapping one field for another.
  const cropName = crop?.name ?? ''
  measureRef.current = measure

  // The two hectares fields and the harvest figure, watched only so the form
  // can say what a column's scale will do to what was typed (QA #27).
  const plotArea = watch('plot_area_ha')
  const cycleArea = watch('cycle_area_ha')
  const harvestKg = watch('harvest_quantity_kg')
  const confidence = watch('confidence')

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
      <p data-testid="register-loading" style={{ fontSize: 15, color: 'var(--ink-2)' }}>
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
      <section className="flex max-w-xl flex-col gap-2.5" data-testid="register-success">
        <h1 className="type-screen-title inline-flex items-center gap-2.5">
          <VerificationMark verification="verified" size={20} />
          {t('register.successTitle')}
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)' }}>
          {t('register.successDetail')}
        </p>
        {created?.person_id && (
          <Link
            to="/officer/people/$personId"
            params={{ personId: created.person_id }}
            data-testid="register-view-person"
            className="inline-flex w-full items-center justify-center font-semibold"
            style={{
              minHeight: 48,
              border: '1.5px solid var(--primary)',
              borderRadius: 'var(--radius-control)',
              background: 'var(--primary-tint)',
              color: 'var(--primary-ink)',
              fontSize: 16,
            }}
          >
            {t('register.viewPerson')}
          </Link>
        )}
        <button
          type="button"
          data-testid="register-another"
          className="inline-flex w-full items-center justify-center font-medium"
          style={{
            minHeight: 48,
            border: '1.5px solid var(--rule-2)',
            borderRadius: 'var(--radius-control)',
            background: 'var(--paper)',
            color: 'var(--ink)',
            fontSize: 16,
          }}
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
      <p
        id={`register-${fieldId(name)}-error`}
        data-testid={`register-${fieldId(name)}-error`}
        className="flex items-start gap-[7px] font-medium"
        style={{ fontSize: 13, color: 'var(--flag-ink)', textWrap: 'pretty' }}
      >
        <BangMark />
        {t(message ?? 'register.required')}
      </p>
    )
  }

  /**
   * A field's whole presentation, in one place: the 48px control, and — when it
   * failed validation — the red edge, `aria-invalid` and a pointer at the
   * message, so the failure reaches assistive tech as well as the eye.
   */
  const fieldProps = (name: keyof RegisterForm) => {
    const failed = Boolean(formState.errors[name])
    return {
      className: inputClass,
      style: failed ? { ...inputStyle, border: '1.5px solid var(--flag-ink)' } : inputStyle,
      ...(failed
        ? { 'aria-invalid': true as const, 'aria-describedby': `register-${fieldId(name)}-error` }
        : {}),
    }
  }

  /** What a column's scale will store, when that is not what was typed. */
  const rounded = (testId: string, value: string | undefined, dp: number) => {
    const stored = roundedTo(value ?? '', dp)
    if (!stored) return null
    return (
      <p
        data-testid={`${testId}-rounded`}
        className="type-note flex items-center gap-[7px]"
        style={{ color: 'var(--ink-2)' }}
      >
        {/* Hatched: what is on screen is not yet what will be stored. */}
        <HatchMark />
        {t('register.roundedNote', { value: stored })}
      </p>
    )
  }

  const values = watch()
  const done = (group: RegisterGroup) => isGroupComplete(group, values, measure)
  const completeCount = REGISTER_GROUPS.filter(done).length

  return (
    <section className="flex max-w-xl flex-col gap-[18px]">
      <header className="flex flex-col gap-2">
        <h1 className="type-screen-title">{t('register.title')}</h1>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--ink-2)' }}>
          {t('register.intro')}
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          {draft.status === 'dirty' && <UnsavedDraftBadge />}
          {/* Provenance is never a user-facing choice on this screen. */}
          <span
            className="type-note inline-flex items-center gap-[7px] px-3 py-1.5 font-medium"
            style={{
              border: '1px solid var(--rule-2)',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--primary-tint)',
              color: 'var(--primary-ink)',
            }}
          >
            <VerificationMark verification="verified" size={13} />
            {t('register.provenanceNote')}
          </span>
        </div>
      </header>

      {/*
        A rail, not a wizard. Six chips say which groups are filled in, which is
        open and what is left — without splitting one transaction into six
        submits. The marks are the same shapes verification uses, so the
        vocabulary is learned once.
      */}
      <ul className="flex flex-wrap gap-2">
        {REGISTER_GROUPS.map((group) => (
          <li key={group}>
            <span
              data-group={group}
              data-complete={done(group) ? 'yes' : 'no'}
              className="type-note inline-flex items-center gap-2 px-3 py-1.5 font-medium"
              style={{
                border: `1px solid ${done(group) ? 'var(--green-ink)' : 'var(--rule-2)'}`,
                borderRadius: 'var(--radius-pill)',
                background: done(group) ? 'var(--green-tint)' : 'var(--paper)',
                color: done(group) ? 'var(--green-ink)' : 'var(--ink-2)',
              }}
            >
              {done(group) ? (
                <VerificationMark verification="verified" size={13} />
              ) : (
                <VerificationMark verification="unverified" size={13} />
              )}
              {t(`register.sections.${group}`)}
            </span>
          </li>
        ))}
      </ul>

      <form
        className="flex flex-col gap-4"
        noValidate
        // QA #23. `formState.isSubmitting` is set synchronously when the
        // handler starts; `submit.isPending` is not, because validation is
        // asynchronous and the mutation has not begun on the tick the officer
        // clicks again. The control below is disabled on both.
        onSubmit={handleSubmit((form) => submit.mutate(form))}
      >
        <Fieldset number={1} legend={t('register.sections.person')}>
          <Field label={t('register.givenName')} id="register-given-name">
            <input
              id="register-given-name"
              data-testid="register-given-name"
              {...fieldProps('given_name')}
              {...register('given_name')}
            />
          </Field>
          {err('given_name')}
          <Field label={t('register.familyName')} id="register-family-name">
            <input
              id="register-family-name"
              data-testid="register-family-name"
              {...fieldProps('family_name')}
              {...register('family_name')}
            />
          </Field>
          {err('family_name')}
          <Field label={t('register.phone')} id="register-phone" optional>
            <input
              id="register-phone"
              data-testid="register-phone"
              className={inputClass}
              style={inputStyle}
              {...register('phone')}
            />
          </Field>
          {/* `person.phone` is free text by design — the seed uses +255… and
              there is no rule to enforce, so a hint is the whole fix. #28. */}
          <p data-testid="register-phone-hint" className="type-note" style={{ color: 'var(--ink-3)' }}>
            {t('register.phoneHint')}
          </p>
        </Fieldset>

        <Fieldset number={2} legend={t('register.sections.household')}>
          <Field label={t('register.householdLabel')} id="register-household-label" optional>
            <input
              id="register-household-label"
              data-testid="register-household-label"
              className={inputClass}
              style={inputStyle}
              {...register('household_label')}
            />
          </Field>
          <label
            className="flex items-center gap-2.5"
            style={{ minHeight: 48, fontSize: 15, color: 'var(--ink)' }}
          >
            <input
              type="checkbox"
              data-testid="register-is-head"
              style={{ width: 20, height: 20, accentColor: '#1d70b7' }}
              {...register('is_head')}
            />
            {t('register.isHead')}
          </label>
        </Fieldset>

        <Fieldset number={3} legend={t('register.sections.farm')}>
          <Field label={t('register.farmLabel')} id="register-farm-label">
            <input
              id="register-farm-label"
              data-testid="register-farm-label"
              {...fieldProps('farm_label')}
              {...register('farm_label')}
            />
          </Field>
          {err('farm_label')}
          <div className="flex flex-wrap gap-3">
            <div style={{ flex: '1 1 150px', minWidth: 0 }}>
            <Field label={t('register.latitude')} id="register-farm-latitude" optional>
              <input
                id="register-farm-latitude"
                data-testid="register-farm-latitude"
                {...fieldProps('farm_latitude')}
              {...register('farm_latitude')}
              />
              {err('farm_latitude')}
            </Field>
            </div>
            <div style={{ flex: '1 1 150px', minWidth: 0 }}>
            <Field label={t('register.longitude')} id="register-farm-longitude" optional>
              <input
                id="register-farm-longitude"
                data-testid="register-farm-longitude"
                {...fieldProps('farm_longitude')}
              {...register('farm_longitude')}
              />
              {err('farm_longitude')}
            </Field>
            </div>
          </div>
          <p className="type-note" style={{ color: 'var(--ink-3)', textWrap: 'pretty' }}>
            {t('register.gpsNote')}
          </p>
        </Fieldset>

        <Fieldset number={4} legend={t('register.sections.plot')}>
          <Field label={t('register.plotLabel')} id="register-plot-label">
            <input
              id="register-plot-label"
              data-testid="register-plot-label"
              {...fieldProps('plot_label')}
              {...register('plot_label')}
            />
          </Field>
          {err('plot_label')}
          <Field label={t('register.plotArea')} id="register-plot-area">
            <input
              id="register-plot-area"
              data-testid="register-plot-area"
              inputMode="decimal"
              {...fieldProps('plot_area_ha')}
              {...register('plot_area_ha')}
            />
          </Field>
          {err('plot_area_ha')}
          {rounded('register-plot-area', plotArea, 4)}
        </Fieldset>

        <Fieldset number={5} legend={t('register.sections.cycle')}>
          <Field label={t('register.crop')} id="register-crop">
            <select
              id="register-crop"
              data-testid="register-crop"
              {...fieldProps('crop_id')}
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
            <Field
              label={t('register.cycleArea')}
              id="register-cycle-area"
              hint={t('register.measuredBy', { crop: cropName })}
            >
              <input
                id="register-cycle-area"
                data-testid="register-cycle-area"
                inputMode="decimal"
                {...fieldProps('cycle_area_ha')}
              {...register('cycle_area_ha')}
              />
              {err('cycle_area_ha')}
              {rounded('register-cycle-area', cycleArea, 4)}
            </Field>
          )}
          {measure === 'tree_count' && (
            <Field
              label={t('register.treeCount')}
              id="register-cycle-tree-count"
              hint={t('register.measuredBy', { crop: cropName })}
            >
              <input
                id="register-cycle-tree-count"
                data-testid="register-cycle-tree-count"
                inputMode="numeric"
                {...fieldProps('cycle_tree_count')}
              {...register('cycle_tree_count')}
              />
              {err('cycle_tree_count')}
            </Field>
          )}
          {measure === 'unit_count' && (
            <Field
              label={t('register.unitCount')}
              id="register-cycle-unit-count"
              hint={t('register.measuredBy', { crop: cropName })}
            >
              <input
                id="register-cycle-unit-count"
                data-testid="register-cycle-unit-count"
                inputMode="numeric"
                {...fieldProps('cycle_unit_count')}
              {...register('cycle_unit_count')}
              />
              {err('cycle_unit_count')}
            </Field>
          )}

          <div className="flex flex-wrap gap-3">
            <div style={{ flex: '1 1 150px', minWidth: 0 }}>
            <Field label={t('register.harvestStart')} id="register-harvest-start">
              <input
                id="register-harvest-start"
                data-testid="register-harvest-start"
                type="date"
                {...fieldProps('harvest_start')}
              {...register('harvest_start')}
              />
              {err('harvest_start')}
            </Field>
            </div>
            <div style={{ flex: '1 1 150px', minWidth: 0 }}>
            <Field label={t('register.harvestEnd')} id="register-harvest-end">
              <input
                id="register-harvest-end"
                data-testid="register-harvest-end"
                type="date"
                {...fieldProps('harvest_end')}
              {...register('harvest_end')}
              />
              {err('harvest_end')}
            </Field>
            </div>
          </div>
        </Fieldset>

        <Fieldset number={6} legend={t('register.sections.harvest')}>
          <Field label={t('register.harvestKg')} id="register-harvest-kg">
            <input
              id="register-harvest-kg"
              data-testid="register-harvest-kg"
              inputMode="decimal"
              {...fieldProps('harvest_quantity_kg')}
              {...register('harvest_quantity_kg')}
            />
          </Field>
          {err('harvest_quantity_kg')}
          {rounded('register-harvest-kg', harvestKg, 2)}
          {/*
            Three targets rather than a select. Confidence is the one field on
            this form an officer sets from judgement rather than from something
            in front of them, and a 48px target each is quicker to hit outdoors
            than opening a picker.
          */}
          <fieldset className="flex flex-col gap-2">
            <legend style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
              {t('register.confidence')}
            </legend>
            <div data-testid="register-confidence" className="flex flex-wrap gap-2">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <ConfidenceTarget
                  key={level}
                  level={level}
                  label={t(`confidence.${level}`)}
                  selected={confidence === level}
                  register={register('confidence')}
                />
              ))}
            </div>
          </fieldset>
        </Fieldset>

        {submit.isError && (
          <div data-testid="register-error">
            <ErrorState error={submit.error} onRetry={() => submit.reset()} />
          </div>
        )}

        {/*
          The submit follows you down. On a form this long the draft badge in
          the header is scrolled away exactly when it matters, so the state and
          the only button that ends it travel together.
        */}
        <div
          className="sticky bottom-0 -mx-4 flex flex-col gap-2.5 px-4 pt-3 pb-4"
          style={{ background: 'var(--sand)', borderTop: '1px solid var(--rule)' }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2.5">
            <span className="type-note" style={{ color: 'var(--ink-3)' }}>
              {t('register.groupsComplete', {
                done: completeCount,
                total: REGISTER_GROUPS.length,
              })}
            </span>
            {draft.status === 'dirty' && (
              <span className="type-note font-semibold" style={{ color: 'var(--flag-ink)' }}>
                {t('draft.notSubmitted')}
              </span>
            )}
          </div>
          <button
            type="submit"
            data-testid="register-submit"
            disabled={submit.isPending || formState.isSubmitting}
            className="w-full font-semibold disabled:opacity-60"
            style={{
              minHeight: 52,
              border: 0,
              borderRadius: 10,
              background: 'var(--primary)',
              color: '#fff',
              fontSize: 17,
              fontFamily: 'inherit',
              textWrap: 'balance',
            }}
          >
            {submit.isPending || formState.isSubmitting
              ? t('register.submitting')
              : t('register.submit')}
          </button>
        </div>
      </form>
    </section>
  )
}

/**
 * 48px tall, 17px type, and wide enough for Kiswahili.
 *
 * Outdoors, one-handed, with someone waiting: the target has to be reachable
 * with a thumb and the value has to be legible in daylight. `min-height` rather
 * than `height`, because a label that wraps must be allowed to.
 */
const inputClass = 'w-full px-3.5 py-3'

const inputStyle = {
  minHeight: 48,
  width: '100%',
  boxSizing: 'border-box' as const,
  border: '1.5px solid var(--rule-2)',
  borderRadius: 'var(--radius-control)',
  background: 'var(--paper)',
  padding: '12px 14px',
  fontSize: 17,
  fontFamily: 'inherit',
  color: 'var(--ink)',
  fontVariantNumeric: 'tabular-nums',
}

function fieldId(name: keyof RegisterForm) {
  return name.replace(/_/g, '-')
}

/** A numbered section card. The number is the officer's place in the form. */
function Fieldset({
  number,
  legend,
  children,
}: {
  number: number
  legend: string
  children: React.ReactNode
}) {
  return (
    <fieldset
      className="flex flex-col gap-3.5 p-[18px]"
      style={{
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-frame)',
        background: 'var(--paper)',
      }}
    >
      <legend className="type-section -ml-1 inline-flex items-center gap-2.5 px-2" style={{ color: 'var(--ink-3)' }}>
        <span
          className="inline-flex items-center justify-center"
          style={{
            width: 20,
            height: 20,
            borderRadius: 'var(--radius-pill)',
            background: 'var(--sand-2)',
            color: 'var(--ink-2)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0,
          }}
        >
          {number}
        </span>
        {legend}
      </legend>
      {children}
    </fieldset>
  )
}

function Field({
  label,
  id,
  optional = false,
  hint,
  children,
}: {
  label: string
  id: string
  /** Said in the label, not implied by its absence. */
  optional?: boolean
  hint?: string
  children: React.ReactNode
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="flex flex-wrap items-baseline gap-x-2"
        htmlFor={id}
        style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}
      >
        {label}
        {optional && (
          <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>· {t('common.optional')}</span>
        )}
        {hint && (
          <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>{hint}</span>
        )}
      </label>
      {children}
    </div>
  )
}

/** One of three confidence targets, carrying the same meter the badge uses. */
function ConfidenceTarget({
  level,
  label,
  selected,
  register,
}: {
  level: 'low' | 'medium' | 'high'
  label: string
  selected: boolean
  register: ReturnType<ReturnType<typeof useForm<RegisterForm>>['register']>
}) {
  const filled = { low: 1, medium: 2, high: 3 }[level]

  return (
    <label
      className="flex items-center justify-center gap-2 p-2.5"
      style={{
        flex: '1 1 90px',
        minHeight: 48,
        border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--rule-2)'}`,
        borderRadius: 'var(--radius-control)',
        background: selected ? 'var(--primary-tint)' : 'var(--paper)',
        fontSize: 15,
        fontWeight: selected ? 600 : 400,
        color: selected ? 'var(--primary-ink)' : 'var(--ink-2)',
      }}
    >
      <input type="radio" value={level} style={{ accentColor: '#1d70b7' }} {...register} />
      <span aria-hidden className="inline-flex items-end gap-[2px]" style={{ height: 11 }}>
        {[5, 8, 11].map((height, index) => (
          <span
            key={height}
            style={{
              width: 3,
              height,
              borderRadius: 1,
              background:
                index < filled
                  ? selected
                    ? 'var(--primary-ink)'
                    : 'var(--ink-2)'
                  : 'var(--rule-2)',
            }}
          />
        ))}
      </span>
      {label}
    </label>
  )
}
