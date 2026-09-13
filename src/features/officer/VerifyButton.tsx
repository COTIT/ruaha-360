import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { VerifiableTable } from '@/features/officer/personDetail'
import type { Database } from '@/lib/db.types'

type Verification = Database['public']['Enums']['verification_status']

/**
 * Verify one record. Officer-only, and the only route to verification is
 * app_verify — nothing sets the columns directly.
 *
 * 48px, because it is tapped in a list, outdoors, one row after another.
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
      className="inline-flex items-center justify-center gap-2 px-4 font-semibold disabled:opacity-60"
      style={{
        minHeight: 48,
        border: '1.5px solid var(--primary)',
        borderRadius: 'var(--radius-control)',
        background: 'var(--primary-tint)',
        color: 'var(--primary-ink)',
        fontSize: 15,
        fontFamily: 'inherit',
        flex: 'none',
      }}
    >
      <Check aria-hidden size={17} strokeWidth={2.5} style={{ flex: 'none' }} />
      {pending ? t('person.verifying') : t('person.verify')}
    </button>
  )
}
