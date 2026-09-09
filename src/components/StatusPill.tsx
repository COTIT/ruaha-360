import { useTranslation } from 'react-i18next'

import type { Database } from '@/lib/db.types'

type RequestStatus = Database['public']['Enums']['pue_status']
type DemandStatus = Database['public']['Enums']['demand_status']
type OpportunityStatus = Database['public']['Enums']['opportunity_status']

export type StatusPillProps =
  | { kind: 'request'; status: RequestStatus }
  | { kind: 'demand'; status: DemandStatus }
  | { kind: 'opportunity'; status: OpportunityStatus }

const NAMESPACE = {
  request: 'requestStatus',
  demand: 'demandStatus',
  opportunity: 'opportunityStatus',
} as const

/**
 * One pill for request, demand and opportunity statuses — spec §9.3.
 *
 * The three kinds keep separate translation namespaces on purpose: an
 * opportunity's 'accepted' means both sides agreed to talk further and nothing
 * has moved, which is a different claim from a request being approved. Sharing
 * a label between them would blur exactly the distinction the schema exists to
 * keep.
 */
export function StatusPill(props: StatusPillProps) {
  const { t } = useTranslation()
  const { kind, status } = props

  return (
    <span
      data-testid="status-pill"
      data-status={status}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styleFor(props)}`}
    >
      {t(`${NAMESPACE[kind]}.${status}`)}
    </span>
  )
}

const REQUEST_STYLE: Record<RequestStatus, string> = {
  draft: 'border-deep/20 bg-white text-deep/60',
  submitted: 'border-primary/30 bg-primary/5 text-primary',
  under_review: 'border-primary/50 bg-primary/10 text-primary',
  approved: 'border-accent/50 bg-accent/15 text-deep',
  rejected: 'border-destructive/30 bg-destructive/5 text-destructive',
  withdrawn: 'border-dashed border-deep/30 bg-white text-deep/50',
}

const DEMAND_STYLE: Record<DemandStatus, string> = {
  open: 'border-primary/30 bg-primary/5 text-primary',
  matched: 'border-accent/50 bg-accent/15 text-deep',
  closed: 'border-deep/20 bg-white text-deep/60',
  cancelled: 'border-dashed border-deep/30 bg-white text-deep/50',
}

const OPPORTUNITY_STYLE: Record<OpportunityStatus, string> = {
  proposed: 'border-deep/25 bg-white text-deep',
  shared: 'border-primary/30 bg-primary/5 text-primary',
  accepted: 'border-accent/50 bg-accent/15 text-deep',
  declined: 'border-destructive/30 bg-destructive/5 text-destructive',
  lapsed: 'border-dashed border-deep/30 bg-white text-deep/50',
}

function styleFor(props: StatusPillProps): string {
  switch (props.kind) {
    case 'request':
      return REQUEST_STYLE[props.status]
    case 'demand':
      return DEMAND_STYLE[props.status]
    case 'opportunity':
      return OPPORTUNITY_STYLE[props.status]
  }
}
