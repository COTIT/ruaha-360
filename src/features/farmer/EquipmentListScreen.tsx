import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { useEquipmentList } from '@/features/farmer/useEquipment'
import { formatKw, formatMoney } from '@/lib/format'

/** Spec 6.3 — the catalogue. Every price is labelled indicative. */
export function EquipmentListScreen() {
  const { t } = useTranslation()
  const query = useEquipmentList()

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  if (query.isLoading) {
    return (
      <p data-testid="equipment-loading" className="text-sm text-deep/60">
        {t('common.loading')}
      </p>
    )
  }

  if (query.items.length === 0) {
    return <EmptyState title={t('equipment.noneTitle')} detail={t('equipment.noneDetail')} />
  }

  return (
    <section className="space-y-3" data-testid="equipment-list">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">{t('equipment.title')}</h1>
        <p className="text-xs text-deep/60">{t('equipment.notAQuotation')}</p>
      </header>

      <ul className="space-y-2">
        {query.items.map((item) => (
          <li key={item.id}>
            <Link
              to="/farm/equipment/$equipmentId"
              params={{ equipmentId: item.id }}
              data-testid={`equipment-card-${item.id}`}
              className="block space-y-1 rounded border border-deep/10 bg-white/70 p-3"
            >
              <span
                data-testid="equipment-card"
                className="block text-sm font-medium text-primary"
              >
                {item.name}
              </span>
              <span className="block text-xs text-deep/60">{item.category_name}</span>
              <span className="tabular block text-sm">{formatKw(item.rated_power_kw)}</span>
              {/* "The word indicative appears next to every price." */}
              <span data-testid="equipment-price" className="tabular block text-sm">
                {formatMoney(item.indicative_price, item.currency)}{' '}
                <span className="text-xs font-normal text-deep/60">
                  ({t('equipment.indicative')})
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
