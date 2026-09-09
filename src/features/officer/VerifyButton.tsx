import { useTranslation } from 'react-i18next'

import type { VerifiableTable } from '@/features/officer/personDetail'
import type { Database } from '@/lib/db.types'

type Verification = Database['public']['Enums']['verification_status']

/**
 * Verify one record. Officer-only, and the only route to verification is
 * app_verify — nothing sets the columns directly.
 */
export function VerifyButton({
  table,
  id,
  verification,
  onVerify,
  pending,
}: {
  table: VerifiableTable
  id: string
  verification: Verification
  onVerify: (target: { table: VerifiableTable; id: string }) => void
  pending: boolean
}) {
  const { t } = useTranslation()

  // Already verified: nothing to do, and no control that implies otherwise.
  if (verification === 'verified') return null

  return (
    <button
      type="button"
      data-testid={`verify-${table}-${id}`}
      data-verify-table={table}
      disabled={pending}
      onClick={() => onVerify({ table, id })}
      className="rounded border border-primary/40 bg-primary/5 px-2 py-1 text-xs font-medium text-primary disabled:opacity-60"
    >
      {pending ? t('person.verifying') : t('person.verify')}
    </button>
  )
}
