import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { Migration, PersistenceAdapter } from './database.js';
import type { MissionRecord, MissionDetail, PledgeRecord, LedgerRecord, MissionArtifact, RunRequest } from '../../shared/mission.js';
import type { ExecutionEvent, RunSummary } from '../../shared/execution.js';

export const missionMigration: Migration = { id: 200, name: 'mission-execution-ledger', up(db) {
  db.exec(`CREATE TABLE b_records (kind TEXT NOT NULL, id TEXT NOT NULL, owner TEXT NOT NULL, snapshot TEXT NOT NULL CHECK(json_valid(snapshot)), ordinal INTEGER PRIMARY KEY AUTOINCREMENT, UNIQUE(kind,id));
    CREATE INDEX b_records_owner ON b_records(kind,owner,ordinal);
    CREATE TABLE b_idempotency (key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, response TEXT NOT NULL CHECK(json_valid(response)));`);
} };
export class MissionStore {
  constructor(readonly adapter: PersistenceAdapter) {}
  get<T>(kind: string, id: string): T | undefined { const row = this.adapter.db.prepare('SELECT snapshot FROM b_records WHERE kind=? AND id=?').get(kind, id); return row ? JSON.parse(String(row.snapshot)) as T : undefined; }
  list<T>(kind: string, owner?: string): T[] {
    const query = owner === undefined ? this.adapter.db.prepare('SELECT snapshot FROM b_records WHERE kind=? ORDER BY ordinal').all(kind) : this.adapter.db.prepare('SELECT snapshot FROM b_records WHERE kind=? AND owner=? ORDER BY ordinal').all(kind, owner);
    return query.map(row => JSON.parse(String(row.snapshot)) as T);
  }
  put(kind: string, id: string, owner: string, value: unknown): void {
    this.adapter.db.prepare('INSERT INTO b_records(kind,id,owner,snapshot) VALUES (?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET owner=excluded.owner,snapshot=excluded.snapshot').run(kind, id, owner, JSON.stringify(value));
  }
  ledger(entry: Omit<LedgerRecord, 'id' | 'createdAt'>): void {
    if (entry.amount <= 0) return;
    const row = { ...entry, id: randomUUID(), createdAt: new Date().toISOString() };
    this.put('ledger', row.id, row.missionId, row);
  }
  detail(id: string): MissionDetail | undefined {
    const mission = this.get<MissionRecord>('mission', id); if (!mission) return;
    const latestRun = mission.latestRunId ? this.get<RunSummary>('run', mission.latestRunId) : undefined;
    const artifact = latestRun ? this.get<MissionArtifact>('artifact', latestRun.id) : undefined;
    const reviewDecision = latestRun ? this.get<NonNullable<MissionDetail['reviewDecision']>>('review', latestRun.id) : undefined;
    const { progress: _progress, pledges: _pledges, ledger: _ledger, latestRun: _run, artifact: _artifact, reviewDecision: _review, ...record } = mission as MissionDetail;
    return { ...record, ...(record.catalog ? {backerCount:record.catalog.seededBackerCount + new Set(this.list<PledgeRecord>('pledge', id).filter(p=>!p.id.startsWith('catalog-')).map(p=>p.contributorId)).size} : {}), pledges: this.list<PledgeRecord>('pledge', id).map(p => {
        const row = this.adapter.db.prepare('SELECT snapshot FROM home_contributors WHERE id=?').get(p.contributorId);
        const persona = row ? JSON.parse(String(row.snapshot)) : undefined;
        return {...p, ...(persona ? {contributor:{id:persona.id,handle:persona.handle,name:persona.name,avatarColor:persona.avatarColor}} : {})};
      }), ledger: this.list<LedgerRecord>('ledger', id),
      progress: { funding: Math.min(1, mission.computePledged / mission.computeGoal), development: latestRun?.status === 'succeeded' ? 1 : 0, verification: artifact?.testEvidenceSource === 'engine' ? 1 : 0, adoption: 0 },
      ...(latestRun ? { latestRun } : {}), ...(artifact ? { artifact } : {}), ...(reviewDecision ? { reviewDecision } : {}) };
  }
  events(runId: string): ExecutionEvent[] { return this.list<ExecutionEvent>('event', runId); }
  latestRequest(missionId: string): RunRequest | null { return this.list<RunRequest>('request', missionId).at(-1) ?? null; }
}
const localized = (en: string, zh: string) => ({ en, 'zh-TW': zh });
export function seedMissions(db: DatabaseSync): void {
  const put = (kind: string, id: string, owner: string, value: unknown) => db.prepare('INSERT INTO b_records(kind,id,owner,snapshot) VALUES (?,?,?,?)').run(kind, id, owner, JSON.stringify(value));
  for (const [id, status, pledged, kind] of [
    ['mission-fixture', 'funding', 0, 'fixture'], ['mission-ready', 'funded', 100, 'fixture'], ['mission-metadata', 'funded', 100, 'github'],
  ] as const) {
    const projectId = kind === 'fixture' ? 'project-queue' : 'project-prime-agent';
    const mission: MissionRecord = {
      id, projectId, status, computeGoal: 100, computePledged: pledged, computeReserved: 0, computeConsumed: 0, generator: 'demo', dataMode: 'demo',
      title: localized('Make retries safe', '讓重試安全可靠'), tagline: localized('A bounded improvement to a bundled task queue.', '改善內建工作佇列的有限範圍任務。'),
      story: { what: localized('A bundled queue utility.', '內建佇列工具。'), why: localized('Avoid invalid retry delays.', '避免無效重試延遲。'), whoBenefits: localized('People exploring the local demo.', '體驗本機示範的使用者。'), approach: localized('A scripted fixture patch with real local verification. No upstream writes.', '腳本修改 fixture，執行真實本機驗證，不寫入上游。') },
      project: { id: projectId, slug: 'task-queue', name: 'Task Queue', description: localized('Bundled demo fixture', '內建示範 fixture'), repoUrl: 'https://github.com/PrimeIntellect-ai/prime-agent', figuresMode: 'demo', maintainer: { id: 'demo-maintainer', name: 'Demo Maintainer', verified: false }, workspace: kind === 'fixture' ? { kind, path: 'retry-queue' } : { kind, url: 'https://github.com/PrimeIntellect-ai/prime-agent' } },
      acceptanceCriteria: [{ id: 'retry-delay', text: localized('Nonnegative retry delay with a regression test.', '非負的重試延遲與回歸測試。'), status: 'pending' }],
      milestones: [{ id: 'verify', title: localized('Local verification', '本機驗證'), share: 1, status: 'pending' }],
    };
    put('mission', id, projectId, mission);
    if (pledged) {
      put('pledge', `seed-${id}`, id, { id: `seed-${id}`, missionId: id, contributorId: 'seed-contributor', amount: pledged, createdAt: '2026-01-01T00:00:00.000Z' });
      put('ledger', `seed-ledger-${id}`, id, { id: `seed-ledger-${id}`, missionId: id, contributorId: 'seed-contributor', type: 'pledge', amount: pledged, createdAt: '2026-01-01T00:00:00.000Z' });
    }
  }
  put('wallet', 'demo-contributor', 'demo-contributor', { balance: 10000 });
  put('wallet', 'seed-contributor', 'seed-contributor', { balance: 0 });
  const template = JSON.parse(String(db.prepare("SELECT snapshot FROM b_records WHERE kind='mission' AND id='mission-ready'").get()!.snapshot)) as MissionRecord;
  const mission = { ...template, id: 'mission-terminal', status: 'needs_review' as const, latestRunId: 'seed-terminal-run' };
  put('mission', mission.id, mission.projectId, mission);
  const run: RunSummary = { id: 'seed-terminal-run', missionId: mission.id, status: 'succeeded', mode: 'demo', computeBudget: 40, computeUsed: 4, startedAt: '2026-01-01T00:00:00.000Z', endedAt: '2026-01-01T00:00:01.000Z' };
  put('run', run.id, mission.id, run);
  put('event', 'seed-terminal-event', run.id, { id: 'seed-terminal-event', runId: run.id, missionId: mission.id, seq: 1, ts: run.endedAt, type: 'terminal', source: 'demo', verified: false, computeDelta: 0, payload: { title: 'Authored demo history', detail: 'Not fresh engine verification.', status: 'succeeded' } });
  const artifact: MissionArtifact = { runId: run.id, missionId: mission.id, mode: 'demo', testEvidenceSource: 'demo', files: [], dossier: { baseline: { command: 'Not observed: authored seed history', limitation: 'No fresh verification.' }, experiments: [], qualityGates: [{ id: 'seed-exception', status: 'unknown', reason: 'Authored demo review state, not engine verification.' }], criterionEvidence: [] }, review: { source: 'static', affectedGate: false, summary: 'Authored demo review state.' } };
  put('artifact', run.id, mission.id, artifact);
}
