/**
 * Drafts and interrupted saves — business-rules §12.
 *
 * Rules this must honour:
 *  - persist to IndexedDB on change, keyed by form name plus client_ref
 *  - restore on mount; clear ONLY after a confirmed server write
 *  - a draft renders an UnsavedDraftBadge. An unsaved write must LOOK unsaved:
 *    no success toast for something that only reached local storage
 *  - retry is explicit and user-initiated
 *
 * Explicitly NOT this module: no background queue, no replay engine, no
 * conflict resolution. That is offline sync, which Plan v2 defers until field
 * testing proves it necessary.
 */

export type DraftStatus = 'empty' | 'restoring' | 'dirty' | 'saved'

export interface Draft<T> {
  /** Restored draft, or undefined when there is nothing stored. */
  draft: T | undefined
  /** Persist to IndexedDB. Not a server write. */
  save: (value: T) => Promise<void>
  /** Call only after the server has confirmed the write. */
  clear: () => Promise<void>
  status: DraftStatus
}

/**
 * @param _key form name plus client_ref, e.g. `register:${clientRef}`
 */
export function useDraft<T>(_key: string): Draft<T> {
  // TODO(tier 1): IndexedDB-backed, one object store keyed by `key`.
  // Needed by /officer/register, which is the interrupted-save case in the
  // acceptance journey.
  throw new Error('useDraft is not implemented yet')
}
