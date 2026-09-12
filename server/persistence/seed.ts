import type { DatabaseSync } from 'node:sqlite';
import type { Contributor } from '../../shared/types.js';

/** Foundation persona only; Phase 2 supplies persistence.home-demo-seed's full graph. */
export function seedFoundation(db: DatabaseSync): void {
  const persona: Contributor = {
    id: 'demo-contributor', name: 'Demo Contributor', handle: 'demo-contributor',
    avatarColor: '#6657ff', bio: { en: 'Local demo persona.', 'zh-TW': '本機示範角色。' },
    walletBalance: 10000, totalPledged: 0, reputation: 0,
    joinedAt: '2026-01-01T00:00:00.000Z', isCurrentUser: true,
  };
  db.prepare('INSERT INTO local_personas(id, snapshot, current) VALUES (?, ?, 1)').run(persona.id, JSON.stringify(persona));
}

export function readCurrentPersona(db: DatabaseSync): Contributor {
  const row = db.prepare('SELECT snapshot FROM local_personas WHERE current = 1').get();
  if (!row) throw new Error('Local demo persona is unavailable');
  return JSON.parse(String(row.snapshot)) as Contributor;
}
