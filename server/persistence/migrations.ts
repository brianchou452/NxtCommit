import { homeMigration } from './home.js';
import type { Migration } from './database.js';

/** Computer A owns ordering. B/C supply migration modules for integration. */
export const migrations: readonly Migration[] = [{
  id: 1,
  name: 'foundation-local-persona',
  up(db) {
    db.exec(`CREATE TABLE local_personas (
      id TEXT PRIMARY KEY,
      snapshot TEXT NOT NULL CHECK (json_valid(snapshot)),
      current INTEGER NOT NULL CHECK (current IN (0, 1))
    );
    CREATE UNIQUE INDEX single_current_persona ON local_personas(current) WHERE current = 1;`);
  },
}, homeMigration];
