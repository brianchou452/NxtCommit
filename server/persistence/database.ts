import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type TransactionWork<T> = (db: DatabaseSync) => T extends PromiseLike<unknown> ? never : T;
export interface Migration { id: number; name: string; up(db: DatabaseSync): void }
export interface PersistenceAdapter {
  readonly db: DatabaseSync;
  transaction<T>(work: TransactionWork<T>): T;
  migrate(migrations: readonly Migration[]): void;
  close(): void;
}

export function openDatabase(path: string): PersistenceAdapter {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');
  let depth = 0;
  const adapter: PersistenceAdapter = {
    db,
    transaction<T>(work: TransactionWork<T>): T {
      const level = depth++;
      const savepoint = `nested_${level}`;
      try {
        db.exec(level === 0 ? 'BEGIN IMMEDIATE' : `SAVEPOINT ${savepoint}`);
        const result = work(db);
        if (result && typeof result === 'object' && 'then' in result) throw new Error('SQLite transactions must be synchronous');
        db.exec(level === 0 ? 'COMMIT' : `RELEASE SAVEPOINT ${savepoint}`);
        return result;
      } catch (error) {
        if (db.isTransaction) {
          db.exec(level === 0 ? 'ROLLBACK' : `ROLLBACK TO SAVEPOINT ${savepoint}; RELEASE SAVEPOINT ${savepoint}`);
        }
        throw error;
      } finally { depth--; }
    },
    migrate(migrations) {
      const ids = new Set<number>();
      for (const migration of migrations) {
        if (!Number.isSafeInteger(migration.id) || migration.id <= 0 || ids.has(migration.id)) throw new Error('Migration IDs must be unique positive integers');
        ids.add(migration.id);
      }
      adapter.transaction(() => {
        for (const migration of [...migrations].sort((a, b) => a.id - b.id)) {
          const applied = db.prepare('SELECT name FROM schema_migrations WHERE id = ?').get(migration.id);
          if (applied) {
            if (applied.name !== migration.name) throw new Error('Applied migration identity changed');
            continue;
          }
          migration.up(db);
          db.prepare('INSERT INTO schema_migrations (id, name) VALUES (?, ?)').run(migration.id, migration.name);
        }
      });
    },
    close: () => db.close(),
  };
  return adapter;
}
