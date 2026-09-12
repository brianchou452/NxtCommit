import type { DatabaseSync } from 'node:sqlite';
import type { PersistenceAdapter } from './database.js';

export interface ResetParticipant {
  id: string;
  /** Abort/drain work before any deletion. Rejection leaves persisted state intact. */
  quiesce(): Promise<void>;
  clear(db: DatabaseSync): void;
  seed(db: DatabaseSync): void;
}

/** Registration order is parent-first; deletion reverses it to preserve foreign keys. */
export function createResetHarness(store: PersistenceAdapter, participants: readonly ResetParticipant[]) {
  if (new Set(participants.map(p => p.id)).size !== participants.length) throw new Error('Duplicate reset participant');
  let pending: Promise<void> | undefined;
  return {
    get pending() { return pending !== undefined; },
    reset(): Promise<void> {
      if (pending) return pending;
      pending = (async () => {
        await Promise.all(participants.map(participant => participant.quiesce()));
        store.transaction(db => {
          for (const participant of [...participants].reverse()) participant.clear(db);
          for (const participant of participants) participant.seed(db);
        });
      })().finally(() => { pending = undefined; });
      return pending;
    },
  };
}
