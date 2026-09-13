import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { IndicativePill, Loading } from '@/components/controls'
import { useEquipmentList } from '@/features/farmer/useEquipment'
import { formatKw, formatMoney } from '@/lib/format'

/** Spec 6.3 — the catalogue. Every price is labelled indicative. */
export function EquipmentListScreen() {
  const { t } = useTranslation()
  const query = useEquipmentList()

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  if (query.isLoading) {
    return <Loading testId="equipment-loading" />
  }

  if (query.items.length === 0) {
    return <EmptyState title={t('equipment.noneTitle')} detail={t('equipment.noneDetail')} />
  }

  return (
    <section className="flex flex-col gap-3.5" data-testid="equipment-list">
      <header className="flex flex-col gap-1.5">
        <h1 className="type-screen-title">{t('equipment.title')}</h1>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)', textWrap: 'pretty' }}>
          {t('equipment.notAQuotation')}
        </p>
      </header>

      <ul className="flex flex-col gap-2.5">
        {query.items.map((item) => (
          <li key={item.id}>
            <Link
              to="/farm/equipment/$equipmentId"
              params={{ equipmentId: item.id }}
              data-testid={`equipment-card-${item.id}`}
              className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-primary-tint"
              style={{
                minHeight: 52,
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius-card)',
                background: 'var(--paper)',
                color: 'var(--ink)',
              }}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <b data-testid="equipment-card" style={{ fontSize: 16, fontWeight: 600 }}>
                  {item.name}
                </b>
                <span className="type-note" style={{ color: 'var(--ink-3)' }}>
                  {item.category_name}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <span className="tabular font-semibold" style={{ fontSize: 15 }}>
                  {formatKw(item.rated_power_kw)}
                </span>
                {/* "The word indicative appears next to every price." */}
                <span
                  data-testid="equipment-price"
                  className="tabular inline-flex flex-wrap items-center justify-end gap-2"
                  style={{ fontSize: 15, fontWeight: 600 }}
                >
                  {formatMoney(item.indicative_price, item.currency)}
                  <IndicativePill />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
