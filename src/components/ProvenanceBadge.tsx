import { useTranslation } from 'react-i18next'

import { formatTimestamp } from '@/lib/format'
import type { Database } from '@/lib/db.types'

type SourceType = Database['public']['Enums']['source_type']
type VerificationStatus = Database['public']['Enums']['verification_status']
type ConfidenceLevel = Database['public']['Enums']['confidence_level']

export interface ProvenanceBadgeProps {
  source: SourceType
  verification: VerificationStatus
  confidence?: ConfidenceLevel | null
  capturedAt: string | null
  capturedBy?: string | null
}

/**
 * One chip carrying where a record's data came from — spec §9.1.
 *
 * This component is how the reported / verified / measured / estimated
 * discipline actually reaches users, so the distinctions are kept sharp:
 * the five source values each get their own treatment via `data-source`,
 * verification is exposed separately via `data-verification`, and an estimate
 * is always labelled an estimate rather than shading into "measured".
 *
 * Appears on every record on every surface.
 */
export function ProvenanceBadge({
  source,
  verification,
  confidence,
  capturedAt,
  capturedBy,
}: ProvenanceBadgeProps) {
  const { t } = useTranslation()

  const sourceLabel = t(`source.${source}`)
  const verificationLabel = t(`verification.${verification}`)
  const captured = formatTimestamp(capturedAt)

  // Long form for the tooltip. capturedBy is omitted when unknown rather than
  // rendered as "by undefined".
  const title = [
    sourceLabel,
    verificationLabel,
    confidence ? `${t('provenance.confidenceLabel')}: ${t(`confidence.${confidence}`)}` : null,
    capturedBy
      ? `${t('provenance.capturedAt')} ${captured} ${t('provenance.capturedBy')} ${capturedBy}`
      : `${t('provenance.capturedAt')} ${captured}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <span
      data-testid="provenance-badge"
      data-source={source}
      data-verification={verification}
      title={title}
      className={`inline-flex flex-wrap items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${SOURCE_STYLE[source]}`}
    >
      <span className="font-medium">{sourceLabel}</span>
      <span data-testid="provenance-verification" className={VERIFICATION_STYLE[verification]}>
        {verificationLabel}
      </span>
      {confidence && (
        <span data-testid="provenance-confidence" className="text-deep/60">
          {t(`confidence.${confidence}`)}
        </span>
      )}
    </span>
  )
}

// Five distinct treatments, one per source category.
const SOURCE_STYLE: Record<SourceType, string> = {
  farmer_reported: 'border-deep/20 bg-white text-deep',
  field_verified: 'border-primary/30 bg-primary/5 text-primary',
  transaction_derived: 'border-deep/30 bg-deep/5 text-deep',
  sensor_derived: 'border-accent/40 bg-accent/10 text-deep',
  model_estimated: 'border-dashed border-deep/30 bg-white text-deep/70',
}

const VERIFICATION_STYLE: Record<VerificationStatus, string> = {
  unverified: 'text-deep/50',
  pending: 'text-deep/70',
  verified: 'font-medium text-primary',
  disputed: 'font-medium text-destructive',
}
