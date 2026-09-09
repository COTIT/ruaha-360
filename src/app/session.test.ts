import { beforeEach, describe, expect, test, vi } from 'vitest'

const getSession = vi.fn()
const from = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => getSession() },
    from: (table: string) => from(table),
  },
  isDemoData: true,
}))

const { fetchSession } = await import('@/app/session')

const USER = '80000000-0000-4000-8000-000000000003'

/** app_user: .select().eq().maybeSingle() */
function appUserChain(result: unknown) {
  return { select: () => ({ eq: () => ({ maybeSingle: async () => result }) }) }
}
/** membership: .select().eq().is() */
function membershipChain(result: unknown) {
  return { select: () => ({ eq: () => ({ is: async () => result }) }) }
}

function mockTables(appUser: unknown, membership: unknown) {
  from.mockImplementation((table: string) =>
    table === 'app_user' ? appUserChain(appUser) : membershipChain(membership),
  )
}

beforeEach(() => {
  getSession.mockReset()
  from.mockReset()
})

describe('fetchSession', () => {
  test('returns null when signed out, which is an answer not an error', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    await expect(fetchSession()).resolves.toBeNull()
  })

  test('resolves auth user, app_user and the caller own memberships', async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: USER, email: 'officer@example.test' } } },
    })
    mockTables(
      { data: { id: USER, person_id: null, display_name: 'Salima Officer', locale: 'sw' }, error: null },
      { data: [{ id: 'm1', role: 'field_officer', project_id: 'p', village_id: 'v', revoked_at: null }], error: null },
    )

    const session = await fetchSession()
    expect(session?.userId).toBe(USER)
    expect(session?.email).toBe('officer@example.test')
    expect(session?.appUser?.display_name).toBe('Salima Officer')
    expect(session?.memberships).toHaveLength(1)
  })

  test('genuinely having no memberships resolves to an empty list', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: USER, email: null } } } })
    mockTables({ data: null, error: null }, { data: [], error: null })

    const session = await fetchSession()
    expect(session?.memberships).toEqual([])
  })

  // The important one. A failed membership read is NOT "no memberships": if it
  // is swallowed, resolveLanding sends a legitimate officer to /no-access and
  // a transient blip looks like a permissions problem.
  test('a failed membership read throws instead of looking like no access', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: USER, email: null } } } })
    mockTables(
      { data: null, error: null },
      { data: null, error: { message: 'network error', code: '' } },
    )

    await expect(fetchSession()).rejects.toThrow(/network error/)
  })

  test('a failed app_user read also throws', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: USER, email: null } } } })
    mockTables(
      { data: null, error: { message: 'permission denied', code: '42501' } },
      { data: [], error: null },
    )

    await expect(fetchSession()).rejects.toThrow(/permission denied/)
  })
})
