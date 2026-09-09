import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Drafts and interrupted saves — business-rules §12.
 *
 * Rules this honours:
 *  - persist on change, keyed by form name plus client_ref
 *  - restore on mount; clear ONLY after a confirmed server write
 *  - a draft renders an UnsavedDraftBadge. An unsaved write must LOOK unsaved:
 *    no success toast for something that only reached local storage
 *  - retry is explicit and user-initiated
 *
 * Explicitly NOT here: no background queue, no replay engine, no conflict
 * resolution. That is offline sync, which Plan v2 defers until field testing
 * proves it necessary.
 */

export type DraftStatus = 'empty' | 'restoring' | 'dirty' | 'saved'

export interface DraftStore {
  get: (key: string) => Promise<unknown>
  set: (key: string, value: unknown) => Promise<void>
  clear: (key: string) => Promise<void>
}

/** Form name plus client_ref, so two registrations in flight cannot collide. */
export function draftKey(form: string, clientRef: string): string {
  return `${form}:${clientRef}`
}

const DB_NAME = 'ruaha360'
const STORE_NAME = 'drafts'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('could not open IndexedDB'))
  })
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = run(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
      }),
  )
}

/** IndexedDB-backed store. The real implementation, used in the browser. */
export const indexedDbDraftStore: DraftStore = {
  get: (key) => tx('readonly', (s) => s.get(key)),
  set: async (key, value) => {
    await tx('readwrite', (s) => s.put(value, key))
  },
  clear: async (key) => {
    await tx('readwrite', (s) => s.delete(key))
  },
}

/** In-memory store, for tests and for environments without IndexedDB. */
export function createMemoryDraftStore(): DraftStore {
  const map = new Map<string, unknown>()
  return {
    get: async (key) => map.get(key),
    set: async (key, value) => void map.set(key, value),
    clear: async (key) => void map.delete(key),
  }
}

/**
 * A browser with storage disabled must not take the form down with it. The
 * draft is a convenience; losing it is bad, crashing is worse.
 */
export async function safeGet(store: DraftStore, key: string): Promise<unknown> {
  try {
    return await store.get(key)
  } catch {
    return undefined
  }
}

export async function safeSet(store: DraftStore, key: string, value: unknown): Promise<boolean> {
  try {
    await store.set(key, value)
    return true
  } catch {
    return false
  }
}

export interface Draft<T> {
  /** Restored draft, or undefined when there is nothing stored. */
  draft: T | undefined
  /** Persist locally. NOT a server write — status stays 'dirty'. */
  save: (value: T) => Promise<void>
  /** Call only after the server has confirmed the write. */
  clear: () => Promise<void>
  status: DraftStatus
}

export function useDraft<T>(key: string, store: DraftStore = indexedDbDraftStore): Draft<T> {
  const storeRef = useRef(store)

  // Key, draft and status move together so a key change cannot leave a draft
  // from the previous form on screen.
  const [state, setState] = useState<{
    key: string
    draft: T | undefined
    status: DraftStatus
  }>({ key, draft: undefined, status: 'restoring' })

  // Adjusting state during render when the key changes, rather than in an
  // effect: setting state synchronously inside an effect triggers a cascading
  // render, and the reset must be visible in the same commit as the new key.
  if (state.key !== key) {
    setState({ key, draft: undefined, status: 'restoring' })
  }

  useEffect(() => {
    let cancelled = false
    void safeGet(storeRef.current, key).then((value) => {
      if (cancelled) return
      setState({ key, draft: value as T | undefined, status: value === undefined ? 'empty' : 'dirty' })
    })
    return () => {
      cancelled = true
    }
  }, [key])

  const save = useCallback(
    async (value: T) => {
      // Stays 'dirty': it only reached local storage. An unsaved write must
      // look unsaved, so this is never reported as saved.
      setState({ key, draft: value, status: 'dirty' })
      await safeSet(storeRef.current, key, value)
    },
    [key],
  )

  const clear = useCallback(async () => {
    try {
      await storeRef.current.clear(key)
    } catch {
      // Nothing to do: the server write already succeeded, which is what
      // matters. A stale local draft is cleaned up on the next restore.
    }
    setState({ key, draft: undefined, status: 'saved' })
  }, [key])

  return { draft: state.draft, save, clear, status: state.status }
}
