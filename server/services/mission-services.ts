import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { ServiceContext } from './context.js';
import { MissionStore, missionMigration, seedMissions } from '../persistence/mission-store.js';
import type { ResetParticipant } from '../persistence/reset.js';
import type { MissionRecord, MissionDetail, RunRequest, PledgeRecord, MissionArtifact } from '../../shared/mission.js';
import type { RunSummary, TerminalRunStatus, ExecutionEvent, ExecutionEvidence, EventEnvelope } from '../../shared/execution.js';
import { MissionError, positiveInteger, assertTransition, allocateRefund, redactEvidence, computeReviewable } from '../domain/mission.js';
import { executeFixture } from './mission-engine.js';
import { readCurrentPersona } from '../persistence/seed.js';

export interface MissionOptions { dispatchMode?: 'inline' | 'queue'; autoWorker?: boolean; executionTimeoutMs?: number }
const installations = new WeakMap<ServiceContext, MissionServices>();
export function installMissionServices(context: ServiceContext, options: MissionOptions = {}): MissionServices {
  let services = installations.get(context);
  if (!services) { services = new MissionServices(context, options); installations.set(context, services); }
  return services;
}
export class MissionServices {
  readonly store: MissionStore;
  readonly events = new EventEmitter();
  readonly resetParticipant: ResetParticipant;
  readonly dispatchMode: 'inline' | 'queue';
  private readonly active = new Map<string, { controller: AbortController; promise: Promise<void> }>();
  private quiescing = false;
  private readonly autoWorker: boolean;
  private readonly timeout: number;
  constructor(readonly context: ServiceContext, options: MissionOptions) {
    context.store.migrate([missionMigration]); this.store = new MissionStore(context.store);
    if (!this.store.get('mission', 'mission-fixture')) context.store.transaction(seedMissions);
    this.dispatchMode = options.dispatchMode ?? (process.env.RUN_DISPATCH_MODE === 'queue' ? 'queue' : 'inline');
    this.autoWorker = options.autoWorker ?? this.dispatchMode === 'inline';
    this.timeout = options.executionTimeoutMs ?? 15000;
    if (['auto', 'demo'].includes(context.execution.configured)) {
      Object.assign(context.execution, { resolved: 'demo' }); delete (context.execution as { error?: string }).error;
    }
    context.evidence = this;
    this.recover();
    this.resetParticipant = { id: 'mission-execution', quiesce: () => this.quiesce(true),
      clear: db => { db.exec('DELETE FROM b_idempotency; DELETE FROM b_records;'); },
      seed: db => { seedMissions(db); this.quiescing = false; },
    };
  }
  getMission(id: string): MissionDetail { const mission = this.store.detail(id); if (!mission) throw new MissionError('not_found', 'Mission not found.', 404); return mission; }
  getRunEvidence(id: string): ExecutionEvidence | undefined {
    const run = this.store.get<RunSummary>('run', id); if (!run) return;
    const artifact = this.store.get<MissionArtifact>('artifact', id);
    return { run, events: this.store.events(id), ...(artifact ? { artifact } : {}) };
  }
  getLatestRunEvidence(missionId: string): ExecutionEvidence | undefined { const mission = this.store.get<MissionRecord>('mission', missionId); return mission?.latestRunId ? this.getRunEvidence(mission.latestRunId) : undefined; }
  private saveMission(mission: MissionRecord): void {
    const { progress: _progress, pledges: _pledges, ledger: _ledger, latestRun: _latestRun, artifact: _artifact, ...record } = mission as MissionDetail;
    this.store.put('mission', record.id, record.projectId, record);
  }
  private publish(missionId: string, envelope: EventEnvelope): void { this.events.emit(missionId, envelope); }
  private publishMission(id: string): void { this.publish(id, { kind: 'mission_update', mission: this.getMission(id) }); }
  private assertAvailable(): void { if (this.quiescing) throw new MissionError('reset_in_progress', 'Execution is draining.', 409); }
  private eligible(mission: MissionRecord): void {
    if (mission.project.workspace.kind !== 'fixture' || mission.project.workspace.path !== 'retry-queue') throw new MissionError('workspace_not_executable', 'Only the bundled fixture is executable; GitHub import is metadata-only.');
    if (!['funded', 'changes_requested', 'failed'].includes(mission.status)) throw new MissionError('mission_ineligible', 'Mission is not ready for execution.');
    if (mission.computePledged - mission.computeConsumed <= 0) throw new MissionError('insufficient_compute', 'No unconsumed credits remain.');
    if (this.context.execution.resolved !== 'demo') throw new MissionError('execution_unavailable', 'Requested real runner is unavailable; explicit mode is not silently downgraded.');
  }
  pledge(id: string, amount: unknown, key?: string): { mission: MissionDetail; wallet: number; achievements: never[]; executionStarting: boolean } {
    this.assertAvailable(); positiveInteger(amount);
    if (key !== undefined && (!key.trim() || key.length > 200)) throw new MissionError('invalid_key', 'Invalid idempotency key.');
    const actor = readCurrentPersona(this.context.store.db).id;
    const fingerprint = JSON.stringify({ operation: 'pledge', id, amount, actor });
    let start = false;
    const response = this.context.store.transaction(db => {
      if (key) {
        const prior = db.prepare('SELECT fingerprint,response FROM b_idempotency WHERE key=?').get(key);
        if (prior) { if (prior.fingerprint !== fingerprint) throw new MissionError('idempotency_conflict', 'Key belongs to a different pledge intent.', 409); return JSON.parse(String(prior.response)) as { mission: MissionDetail; wallet: number; achievements: never[]; executionStarting: boolean }; }
      }
      const mission = this.getMission(id);
      if (mission.status !== 'funding' || amount > mission.computeGoal - mission.computePledged) throw new MissionError('mission_ineligible', 'Pledge must fit the remaining funding goal.');
      const wallet = this.store.get<{ balance: number }>('wallet', actor);
      if (!wallet || wallet.balance < amount) throw new MissionError('insufficient_balance', 'Insufficient prototype credits.');
      wallet.balance -= amount; this.store.put('wallet', actor, actor, wallet);
      this.syncPersonaWallet(actor, wallet.balance, amount);
      const pledge: PledgeRecord = { id: randomUUID(), missionId: id, contributorId: actor, amount, createdAt: new Date().toISOString() };
      this.store.put('pledge', pledge.id, id, pledge); this.store.ledger({ missionId: id, contributorId: actor, type: 'pledge', amount });
      mission.computePledged += amount;
      if (mission.computePledged === mission.computeGoal) { assertTransition(mission.status, 'funded'); mission.status = 'funded'; }
      this.saveMission(mission);
      start = mission.status === 'funded' && mission.project.workspace.kind === 'fixture' && mission.project.workspace.path === 'retry-queue' && this.context.execution.resolved === 'demo';
      if (start) this.dispatch(id);
      const result = { mission: this.getMission(id), wallet: wallet.balance, achievements: [] as never[], executionStarting: start };
      if (key) db.prepare('INSERT INTO b_idempotency(key,fingerprint,response) VALUES (?,?,?)').run(key, fingerprint, JSON.stringify(result));
      return result;
    });
    this.publishMission(id); return response;
  }
  private syncPersonaWallet(id: string, balance: number, pledged = 0): void {
    const row = this.context.store.db.prepare('SELECT snapshot FROM local_personas WHERE id=?').get(id);
    if (row) { const persona = JSON.parse(String(row.snapshot)); persona.walletBalance = balance; persona.totalPledged += pledged; this.context.store.db.prepare('UPDATE local_personas SET snapshot=? WHERE id=?').run(JSON.stringify(persona), id); }
  }
  dispatch(id: string, feedback?: unknown): { dispatch: 'inline'; run: RunSummary } | { dispatch: 'queue'; request: RunRequest } {
    this.assertAvailable();
    if (feedback !== undefined && (typeof feedback !== 'string' || feedback.length > 4000)) throw new MissionError('invalid_feedback', 'Feedback must be bounded text.');
    const result = this.context.store.transaction(() => {
      const mission = this.getMission(id); this.eligible(mission);
      const previous = this.store.latestRequest(id);
      if (previous && ['queued', 'leased'].includes(previous.status)) throw new MissionError('already_queued', 'Mission already has active dispatch.', 409);
      if (this.dispatchMode === 'queue') {
        const now = new Date().toISOString();
        const request: RunRequest = { id: randomUUID(), missionId: id, status: 'queued', attempt: 0, createdAt: now, updatedAt: now };
        this.store.put('request', request.id, id, request);
        if (this.autoWorker) setImmediate(() => { void this.workOnce(`local-${randomUUID()}`).catch(() => {}); });
        return { dispatch: 'queue' as const, request };
      }
      const run = this.startRun(mission); this.launch(run); return { dispatch: 'inline' as const, run };
    });
    this.publishMission(id); return result;
  }
  private startRun(mission: MissionRecord): RunSummary {
    assertTransition(mission.status, 'executing');
    const budget = Math.min(40, mission.computePledged - mission.computeConsumed);
    const run: RunSummary = { id: randomUUID(), missionId: mission.id, mode: 'demo', status: 'running', computeBudget: budget, computeUsed: 0, startedAt: new Date().toISOString() };
    mission.status = 'executing'; mission.latestRunId = run.id; mission.computeReserved = budget;
    this.saveMission(mission); this.store.put('run', run.id, mission.id, run);
    this.store.ledger({ missionId: mission.id, runId: run.id, type: 'reserve', amount: budget });
    return run;
  }
  private persistEvent(run: RunSummary, type: string, source: 'engine' | 'demo', payload: NonNullable<ExecutionEvent['payload']>): ExecutionEvent {
    const redact = (value: unknown): unknown => typeof value === 'string' ? redactEvidence(value) : Array.isArray(value) ? value.map(redact) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item)])) : value;
    const value = { id: randomUUID(), runId: run.id, missionId: run.missionId, seq: this.store.events(run.id).length + 1, ts: new Date().toISOString(), type, source, verified: source === 'engine', computeDelta: 0, payload: redact(payload) } as ExecutionEvent;
    this.store.put('event', value.id, run.id, value); return value;
  }
  emit(runId: string, type: string, source: 'engine' | 'demo', payload: NonNullable<ExecutionEvent['payload']>, ownership?: { requestId: string; owner: string }): void {
    const event = this.context.store.transaction(() => {
      if (ownership) this.requireOwner(ownership.requestId, ownership.owner);
      const run = this.store.get<RunSummary>('run', runId); if (!run || run.status !== 'running') return;
      return this.persistEvent(run, type, source, payload);
    });
    if (event) this.publish(event.missionId, { kind: 'exec_event', event });
  }
  private launch(run: RunSummary, ownership?: { requestId: string; owner: string }): Promise<void> {
    const controller = new AbortController();
    const ownsRequest = () => {
      if (!ownership) return true;
      try { this.requireOwner(ownership.requestId, ownership.owner); return true; } catch { return false; }
    };
    const promise = new Promise<void>(resolveStart => setImmediate(resolveStart)).then(async () => {
      if (controller.signal.aborted) { this.settle(run.id, 'cancelled', ownership); return; }
      const timeout = setTimeout(() => controller.abort('timeout'), this.timeout);
      try {
        if (!ownsRequest()) return;
        if (run.computeBudget < 4) { this.emit(run.id, 'guard', 'engine', { title: 'Budget exhausted before verification' }, ownership); this.settle(run.id, 'budget_exhausted', ownership); return; }
        const result = await executeFixture(run.missionId, run.id, controller.signal, (type, source, payload) => {
          if (!ownsRequest()) throw new MissionError('stale_lease', 'Worker no longer owns this request.', 409);
          this.emit(run.id, type, source, payload, ownership);
        });
        if (ownership) this.requireOwner(ownership.requestId, ownership.owner);
        if (!controller.signal.aborted) this.settle(run.id, result.reviewable ? 'succeeded' : 'blocked', ownership, result.artifact);
      } catch (error) {
        // Recovery owns settlement after lease expiry. A stale callback cannot write evidence,
        // mission state, artifact or accounting, including on its failure/cancellation path.
        if (!ownsRequest()) return;
        this.emit(run.id, 'guard', 'engine', { title: 'Execution stopped', code: error instanceof MissionError ? error.code : 'execution_failed', detail: controller.signal.aborted ? 'Interrupted or bounded timeout reached.' : 'Fixture execution did not produce verified success.' }, ownership);
        this.settle(run.id, controller.signal.aborted ? (controller.signal.reason === 'timeout' ? 'failed' : 'cancelled') : 'failed', ownership);
      } finally {
        clearTimeout(timeout);
        if (ownership && ownsRequest()) {
          try { this.complete(ownership.requestId, ownership.owner, run.id); } catch { /* Nonterminal/recovered requests are not completed by this callback. */ }
        }
      }
    }).finally(() => { this.active.delete(run.id); });
    this.active.set(run.id, { controller, promise }); return promise;
  }
  settle(runId: string, status: TerminalRunStatus, ownership?: { requestId: string; owner: string }, newArtifact?: MissionArtifact): boolean {
    const notifications: EventEnvelope[] = [];
    const committed = this.context.store.transaction(() => {
      // Final write authority is checked under the SAME SQLite transaction as every
      // artifact, ledger, event, mission, run and request mutation. No publish occurs here.
      let request: RunRequest | undefined;
      if (ownership) {
        try { request = this.requireOwner(ownership.requestId, ownership.owner); } catch (error) { if (error instanceof MissionError && ['stale_lease', 'not_found'].includes(error.code)) return false; throw error; }
        if (request.resultRunId !== runId) return false;
      }
      const run = this.store.get<RunSummary>('run', runId); if (!run || run.status !== 'running') return false;
      if (request && request.missionId !== run.missionId) return false;
      if (newArtifact) this.store.put('artifact', run.id, run.missionId, newArtifact);
      if (status === 'succeeded') {
        const artifact = this.store.get<MissionArtifact>('artifact', runId);
        const final = artifact?.dossier.experiments.at(-1);
        if (!artifact || artifact.testEvidenceSource !== 'engine' || !final || !computeReviewable(artifact.dossier.baseline, final, artifact.files, artifact.dossier.qualityGates.every(gate => gate.status === 'passed')).reviewable) throw new MissionError('reviewability_required', 'Only engine-verified reviewable evidence can succeed.');
      }
      const mission = this.getMission(run.missionId);
      const used = Math.min(run.computeBudget, mission.computeReserved, Math.max(0, mission.computePledged - mission.computeConsumed), status === 'succeeded' ? 4 : 1);
      run.computeUsed = used;
      this.store.ledger({ missionId: mission.id, runId, type: 'consume', amount: used });
      mission.computeConsumed += used;
      const unused = Math.max(0, mission.computeReserved - used);
      const pledges = this.store.list<PledgeRecord>('pledge', mission.id);
      // Refund only the current reservation; rounding is deterministic and exact.
      const allocations = allocateRefund(unused, pledges.map(row => ({ id: row.id, amount: row.amount })));
      for (const pledge of pledges) {
        const amount = allocations.get(pledge.id) ?? 0; if (!amount) continue;
        const wallet = this.store.get<{ balance: number }>('wallet', pledge.contributorId) ?? { balance: 0 };
        wallet.balance += amount; this.store.put('wallet', pledge.contributorId, pledge.contributorId, wallet); this.syncPersonaWallet(pledge.contributorId, wallet.balance);
        this.store.ledger({ missionId: mission.id, runId, contributorId: pledge.contributorId, type: 'refund_unused', amount });
      }
      mission.computeReserved = 0;
      // Returned credits no longer belong to the mission and cannot be spent on a retry.
      mission.computePledged -= unused;
      const next = status === 'succeeded' ? 'needs_review' : ['blocked', 'cancelled', 'budget_exhausted'].includes(status) ? 'stalled' : 'failed';
      assertTransition(mission.status, next); mission.status = next;
      notifications.push({ kind: 'exec_event', event: this.persistEvent(run, 'accounting', 'engine', { title: 'Prototype accounting settled', consumed: used, refunded: unused }) });
      notifications.push({ kind: 'exec_event', event: this.persistEvent(run, 'terminal', 'engine', { title: 'Run reached terminal state', status }) });
      const terminal: RunSummary = { ...run, status, endedAt: new Date().toISOString() };
      this.store.put('run', runId, mission.id, terminal); this.saveMission(mission);
      if (request) { request.status = status === 'succeeded' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'failed'; request.updatedAt = terminal.endedAt; delete request.leaseOwner; delete request.leaseExpiresAt; this.store.put('request', request.id, request.missionId, request); }
      notifications.push({ kind: 'run_update', run: terminal }, { kind: 'mission_update', mission: this.getMission(mission.id) }); return true;
    });
    if (committed) {
      const publish = () => {
        const persisted = this.store.get<RunSummary>('run', runId);
        if (!persisted || persisted.status !== status) return;
        for (const notification of notifications) this.publish(persisted.missionId, notification);
      };
      // Recovery/reset may own an outer transaction. Let it finish (or roll back)
      // before observers run, and re-read persisted state before emitting anything.
      if (this.context.store.db.isTransaction) queueMicrotask(() => { try { publish(); } catch { /* Closed/reset store has no live subscriber evidence. */ } }); else publish();
    }
    return committed;
  }
  request(id: string): RunRequest { const row = this.store.get<RunRequest>('request', id); if (!row) throw new MissionError('not_found', 'Request not found.', 404); return row; }
  publicRequest(row: RunRequest): Omit<RunRequest, 'leaseOwner' | 'leaseExpiresAt'> { const { leaseOwner: _owner, leaseExpiresAt: _expiry, ...publicRow } = row; return publicRow; }
  claim(owner: string, now = Date.now(), leaseMs = 30000): RunRequest | undefined {
    this.assertAvailable();
    return this.context.store.transaction(() => {
      this.recover(now);
      const row = this.store.list<RunRequest>('request').find(item => item.status === 'queued'); if (!row) return;
      row.status = 'leased'; row.attempt++; row.leaseOwner = owner; row.leaseExpiresAt = new Date(now + leaseMs).toISOString(); row.updatedAt = new Date(now).toISOString();
      this.store.put('request', row.id, row.missionId, row); return row;
    });
  }
  private requireOwner(id: string, owner: string, now = Date.now()): RunRequest {
    const row = this.request(id);
    if (row.status !== 'leased' || row.leaseOwner !== owner || Date.parse(row.leaseExpiresAt ?? '') <= now) throw new MissionError('stale_lease', 'Worker no longer owns this request.', 409);
    return row;
  }
  heartbeat(id: string, owner: string, now = Date.now(), leaseMs = 30000): void {
    this.context.store.transaction(() => { const row = this.requireOwner(id, owner, now); row.leaseExpiresAt = new Date(now + leaseMs).toISOString(); row.updatedAt = new Date(now).toISOString(); this.store.put('request', id, row.missionId, row); });
  }
  complete(id: string, owner: string, runId: string): void {
    this.context.store.transaction(() => {
      const row = this.requireOwner(id, owner); const run = this.store.get<RunSummary>('run', runId);
      if (!run || run.missionId !== row.missionId || run.status === 'running' || row.resultRunId !== runId) throw new MissionError('invalid_result', 'Owned terminal run required.');
      row.status = run.status === 'succeeded' ? 'completed' : run.status === 'cancelled' ? 'cancelled' : 'failed'; row.updatedAt = new Date().toISOString(); delete row.leaseOwner; delete row.leaseExpiresAt;
      this.store.put('request', id, row.missionId, row);
    });
  }
  async workOnce(owner: string): Promise<boolean> {
    const request = this.claim(owner); if (!request) return false;
    let run: RunSummary;
    try {
      run = this.context.store.transaction(() => {
        const row = this.requireOwner(request.id, owner); const mission = this.getMission(row.missionId); this.eligible(mission);
        const started = this.startRun(mission); row.resultRunId = started.id; this.store.put('request', row.id, row.missionId, row); return started;
      });
    } catch {
      this.context.store.transaction(() => { const row = this.requireOwner(request.id, owner); row.status = 'failed'; row.error = 'Mission no longer eligible.'; delete row.leaseOwner; delete row.leaseExpiresAt; this.store.put('request', row.id, row.missionId, row); });
      return true;
    }
    const heartbeat = setInterval(() => { try { this.heartbeat(request.id, owner); } catch { this.active.get(run.id)?.controller.abort('lost_lease'); } }, 5000);
    try { await this.launch(run, { requestId: request.id, owner }); } finally { clearInterval(heartbeat); }
    return true;
  }
  recover(now = Date.now()): void {
    this.context.store.transaction(() => {
      for (const request of this.store.list<RunRequest>('request')) {
        if (request.status !== 'leased' || Date.parse(request.leaseExpiresAt ?? '') > now) continue;
        if (request.resultRunId) { this.active.get(request.resultRunId)?.controller.abort('lease_expired'); this.settle(request.resultRunId, 'cancelled'); }
        request.status = request.resultRunId || request.attempt >= 3 ? 'failed' : 'queued'; request.error = 'Expired worker lease recovered.';
        request.updatedAt = new Date(now).toISOString(); delete request.leaseOwner; delete request.leaseExpiresAt;
        this.store.put('request', request.id, request.missionId, request);
      }
      for (const run of this.store.list<RunSummary>('run')) {
        if (run.status !== 'running' || this.active.has(run.id)) continue;
        const owner = this.store.list<RunRequest>('request', run.missionId).find(row => row.resultRunId === run.id && row.status === 'leased');
        if (!owner) this.settle(run.id, 'cancelled');
      }
    });
  }
  async quiesce(drainQueue = false): Promise<void> {
    this.quiescing = true;
    for (const active of this.active.values()) active.controller.abort('shutdown');
    await Promise.all([...this.active.values()].map(active => active.promise));
    this.context.store.transaction(() => {
      for (const request of this.store.list<RunRequest>('request')) {
        if (!drainQueue) continue;
        if (!['queued', 'leased'].includes(request.status)) continue;
        if (request.resultRunId) this.settle(request.resultRunId, 'cancelled');
        request.status = 'cancelled'; delete request.leaseOwner; delete request.leaseExpiresAt; this.store.put('request', request.id, request.missionId, request);
      }
      if (drainQueue) for (const run of this.store.list<RunSummary>('run')) if (run.status === 'running') this.settle(run.id, 'cancelled');
    });
  }
}
