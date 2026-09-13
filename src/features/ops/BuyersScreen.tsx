import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'

import { useSession } from '@/app/session'
import { activeMemberships } from '@/app/membership'
import { DataTable } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { BUTTON_PRIMARY, CONTROL } from '@/components/controlStyles'
import { Loading } from '@/components/controls'
import {
  BUYER_CHANNELS,
  useBuyers,
  useCreateBuyer,
  type Buyer,
} from '@/features/ops/useOpsReference'

/**
 * Spec 7.5 — buyers. List and create.
 *
 * `channel = 'afm'` is a LABEL ONLY: no API, no integration, no partnership
 * assumed (Plan S12, and the migration says so at the table). The screen states
 * that rather than leaving a reader to infer a connection that does not exist.
 */
export function BuyersScreen() {
  const { t } = useTranslation()
  const query = useBuyers()
  const create = useCreateBuyer()
  const { data: session } = useSession()

  const [name, setName] = useState('')
  const [channel, setChannel] = useState<Buyer['channel']>('direct')
  const [contactNote, setContactNote] = useState('')
  const [nameError, setNameError] = useState(false)

  // Ops and admin hold whole-project scope, so the membership names the
  // project a new buyer belongs to.
  const projectId = activeMemberships(session?.memberships ?? [])[0]?.project_id

  const columns = useMemo(() => {
    const col = createColumnHelper<Buyer>()
    return [
      col.accessor('name', { header: t('buyers.colName') }),
      col.accessor('channel', {
        header: t('buyers.colChannel'),
        cell: (c) => t(`buyers.channel.${c.getValue()}`),
      }),
      col.accessor('contact_note', {
        header: t('buyers.colContact'),
        cell: (c) => c.getValue() ?? '—',
      }),
      col.accessor('is_active', {
        header: t('buyers.colActive'),
        cell: (c) => (c.getValue() ? t('common.yes') : t('common.no')),
      }),
    ]
  }, [t])

  const submit = () => {
    // The only client-side check is that a required field was filled. Every
    // rule the database owns — the unique (project_id, name) constraint, and
    // whether this caller manages the project — is left to it.
    if (!name.trim() || !projectId) {
      setNameError(true)
      return
    }
    setNameError(false)
    create.mutate(
      {
        project_id: projectId,
        name: name.trim(),
        channel,
        contact_note: contactNote.trim() || null,
      },
      {
        onSuccess: () => {
          setName('')
          setContactNote('')
          setChannel('direct')
        },
      },
    )
  }

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <h1 className="type-screen-title">{t('buyers.title')}</h1>
        <p data-testid="buyers-note" className="type-note" style={{ color: 'var(--ink-3)' }}>
          {t('buyers.channelNote')}
        </p>
      </header>

      {query.isLoading ? (
        <Loading testId="buyers-loading" />
      ) : (
        <DataTable
          columns={columns}
          data={query.data ?? []}
          testId="buyers-table"
          rowTestId="buyer-row"
          empty={{ title: t('buyers.noneTitle'), detail: t('buyers.noneDetail') }}
        />
      )}

      <section
        className="flex max-w-3xl flex-col gap-3 p-[18px]"
        style={{
          border: '1px solid var(--rule)',
          borderRadius: 'var(--radius-card)',
          background: 'var(--paper)',
        }}
      >
        <h2 className="type-section" style={{ color: 'var(--ink-3)' }}>{t('buyers.createTitle')}</h2>

        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-0 flex-col gap-1.5" style={{ flex: '1 1 200px', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
            <span className="block type-note" style={{ color: 'var(--ink-2)' }}>{t('buyers.colName')}</span>
            <input
              data-testid="buyer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full" style={CONTROL}
            />
            {nameError && (
              <span data-testid="buyer-name-error" className="block type-note font-medium" style={{ color: 'var(--flag-ink)' }}>
                {t('buyers.nameRequired')}
              </span>
            )}
          </label>

          <label className="flex min-w-0 flex-col gap-1.5" style={{ flex: '1 1 200px', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
            <span className="block type-note" style={{ color: 'var(--ink-2)' }}>{t('buyers.colChannel')}</span>
            <select
              data-testid="buyer-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as Buyer['channel'])}
              className="w-full" style={CONTROL}
            >
              {BUYER_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {t(`buyers.channel.${c}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-col gap-1.5" style={{ flex: '1 1 200px', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
            <span className="block type-note" style={{ color: 'var(--ink-2)' }}>{t('buyers.colContact')}</span>
            <input
              data-testid="buyer-contact-note"
              value={contactNote}
              onChange={(e) => setContactNote(e.target.value)}
              className="w-full" style={CONTROL}
            />
          </label>
        </div>

        {/* The database's message as written — a unique-name violation names
            the collision better than a generic failure would. */}
        {create.error && <ErrorState error={create.error} />}

        <button
          type="button"
          data-testid="buyer-create-submit"
          disabled={create.isPending}
          onClick={submit}
          className="disabled:opacity-60" style={BUTTON_PRIMARY}
        >
          {create.isPending ? t('buyers.creating') : t('buyers.create')}
        </button>
      </section>
    </section>
  )
}
