import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'

import { DataTable } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { StatusPill } from '@/components/StatusPill'
import {
  useCreateDemand,
  useDemandFormOptions,
  useDemands,
  type Demand,
} from '@/features/ops/useDemand'
import { formatKg, formatMoney, formatPlainDate } from '@/lib/format'

/** Spec 7.6 — the order book, plus a create form. */
export function DemandListScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const query = useDemands()
  const options = useDemandFormOptions()
  const create = useCreateDemand()

  const [buyerId, setBuyerId] = useState('')
  const [cropId, setCropId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [windowStart, setWindowStart] = useState('')
  const [windowEnd, setWindowEnd] = useState('')
  const [deliveryPoint, setDeliveryPoint] = useState('')
  const [pricePerKg, setPricePerKg] = useState('')
  const [qualityNote, setQualityNote] = useState('')
  const [touched, setTouched] = useState(false)

  const columns = useMemo(() => {
    const col = createColumnHelper<Demand>()
    return [
      col.accessor('buyer_name', { header: t('demand.colBuyer') }),
      col.accessor('crop_name', { header: t('demand.colCrop') }),
      col.accessor('quantity_kg', {
        header: t('demand.colQuantity'),
        cell: (c) => formatKg(c.getValue()),
      }),
      col.accessor((r) => `${r.window_start}|${r.window_end}`, {
        id: 'window',
        header: t('demand.colWindow'),
        cell: (c) => {
          const [start, end] = String(c.getValue()).split('|')
          return `${formatPlainDate(start)} – ${formatPlainDate(end)}`
        },
      }),
      col.accessor('indicative_price_per_kg', {
        header: t('demand.colPrice'),
        // Prices are indicative, never quotations.
        cell: (c) => (
          <span>
            {formatMoney(c.getValue(), c.row.original.currency)}{' '}
            <span className="text-xs font-normal text-deep/60">({t('equipment.indicative')})</span>
          </span>
        ),
      }),
      col.accessor('quality_note', {
        header: t('demand.qualityNote'),
        cell: (c) => c.getValue() ?? '—',
      }),
      col.accessor('status', {
        header: t('demand.colStatus'),
        cell: (c) => <StatusPill kind="demand" status={c.getValue()} />,
      }),
    ]
  }, [t])

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  const projectId = options.data?.buyers.find((b) => b.id === buyerId)?.project_id
  const missing = {
    buyer: touched && buyerId === '',
    crop: touched && cropId === '',
    quantity: touched && (quantity === '' || Number(quantity) <= 0),
  }

  const submit = () => {
    setTouched(true)
    if (buyerId === '' || cropId === '' || quantity === '' || Number(quantity) <= 0) return
    if (!projectId) return

    create.mutate({
      projectId,
      buyerId,
      cropId,
      quantityKg: Number(quantity),
      windowStart,
      windowEnd,
      deliveryPoint,
      pricePerKg,
      qualityNote,
    })
  }

  return (
    <section className="space-y-6">
      <h1 className="text-lg font-semibold">{t('demand.title')}</h1>

      <section className="max-w-2xl space-y-3 rounded border border-deep/10 bg-white/60 p-4">
        <h2 className="text-sm font-semibold">{t('demand.createTitle')}</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('demand.buyer')} id="demand-buyer" error={missing.buyer ? t('demand.required') : undefined} errorTestId="demand-buyer-error">
            <select id="demand-buyer" data-testid="demand-buyer" value={buyerId} onChange={(e) => setBuyerId(e.target.value)} className={input}>
              <option value="">{t('demand.chooseBuyer')}</option>
              {(options.data?.buyers ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>

          <Field label={t('demand.crop')} id="demand-crop" error={missing.crop ? t('demand.required') : undefined} errorTestId="demand-crop-error">
            <select id="demand-crop" data-testid="demand-crop" value={cropId} onChange={(e) => setCropId(e.target.value)} className={input}>
              <option value="">{t('demand.chooseCrop')}</option>
              {(options.data?.crops ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label={t('demand.quantity')} id="demand-quantity" error={missing.quantity ? t('demand.required') : undefined} errorTestId="demand-quantity-error">
            <input id="demand-quantity" data-testid="demand-quantity" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={input} />
          </Field>

          <Field label={t('demand.pricePerKg')} id="demand-price">
            <input id="demand-price" data-testid="demand-price" inputMode="decimal" value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} className={input} />
          </Field>

          <Field label={t('demand.windowStart')} id="demand-window-start">
            <input id="demand-window-start" data-testid="demand-window-start" type="date" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} className={input} />
          </Field>

          <Field label={t('demand.windowEnd')} id="demand-window-end">
            <input id="demand-window-end" data-testid="demand-window-end" type="date" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} className={input} />
          </Field>

          <Field label={t('demand.deliveryPoint')} id="demand-delivery">
            <input id="demand-delivery" data-testid="demand-delivery" value={deliveryPoint} onChange={(e) => setDeliveryPoint(e.target.value)} className={input} />
          </Field>

          <Field label={t('demand.qualityNote')} id="demand-quality-note">
            <input id="demand-quality-note" data-testid="demand-quality-note" value={qualityNote} onChange={(e) => setQualityNote(e.target.value)} className={input} />
          </Field>
        </div>

        {create.isError && (
          <div data-testid="demand-create-error">
            <ErrorState error={create.error} onRetry={() => create.reset()} />
          </div>
        )}

        <button
          type="button"
          data-testid="demand-create-submit"
          disabled={create.isPending}
          onClick={submit}
          className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {create.isPending ? t('demand.creating') : t('demand.create')}
        </button>
      </section>

      {query.isLoading ? (
        <p data-testid="demand-loading" className="text-sm text-deep/60">{t('common.loading')}</p>
      ) : (
        <DataTable
          columns={columns}
          data={query.demands}
          testId="demand-table"
          rowTestId="demand-row"
          onRowClick={(row) => void navigate({ to: '/ops/demand/$demandId', params: { demandId: row.id } })}
          empty={{ title: t('demand.noneTitle'), detail: t('demand.noneDetail') }}
        />
      )}
    </section>
  )
}

const input = 'w-full rounded border border-deep/20 bg-white px-3 py-2'

function Field({
  label,
  id,
  error,
  errorTestId,
  children,
}: {
  label: string
  id: string
  error?: string
  errorTestId?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium" htmlFor={id}>{label}</label>
      {children}
      {error && (
        <p data-testid={errorTestId} className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
