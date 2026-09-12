import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

/** OS-owned SQLite write lock: automatically released even after SIGKILL. Never unlink this file. */
export async function acquireLease(path: string, waitMs = 0, signal?: AbortSignal): Promise<() => void> {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  chmodSync(path, 0o600);
  db.exec('PRAGMA busy_timeout = 0');
  const deadline = Date.now() + waitMs;
  try {
    for (;;) {
      signal?.throwIfAborted();
      try {
        db.exec('BEGIN IMMEDIATE');
        break;
      } catch (error) {
        if ((error as { errcode?: number }).errcode !== 5) throw error;
        if (Date.now() >= deadline) throw Error('agent_busy');
        await delay(25, undefined, signal ? { signal } : {});
      }
    }
    let released = false;
    return () => {
      if (!released) {
        released = true;
        try {
          db.exec('ROLLBACK');
        } finally {
          db.close();
        }
      }
    };
  } catch (error) {
    db.close();
    throw error;
  }
}
