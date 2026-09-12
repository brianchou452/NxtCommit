import { Router } from 'express';
import type { RouteModule } from './types.js';
import { validateReviewDecision } from '../domain/reviewability.js';
import { bilingual } from '../authoring/campaign.js';
import { redactText } from '../authoring/analyzer.js';

export const reviewRoutes: RouteModule = context => {
  const router = Router(); const services = context.authoring;
  if (!services) return router;
  const read = (runId: string) => context.evidence?.getRunEvidence(runId);
  // A later B module can handle its own missions before this C-owned fallback.
  router.get('/api/missions/:id', (request, response, next) => {
    const mission = services.repository.get(request.params.id);
    if (!mission) { next(); return; }
    const evidence = context.evidence?.getLatestRunEvidence(mission.id);
    response.json({ mission, ...(evidence ? { evidence } : {}), reviewability: services.reviewability(evidence) });
  });
  router.get('/api/missions/:id/stream', (request, response, next) => {
    const id = request.params.id;
    if (!services.repository.get(id)) { next(); return; }
    response.setHeader('Content-Type', 'text/event-stream'); response.setHeader('Connection', 'keep-alive'); response.flushHeaders();
    let previous = '';
    const publish = () => {
      const mission = services.repository.get(id);
      if (!mission) { response.end(); return; }
      const value = JSON.stringify({ id: mission.id, status: mission.status, latestRunId: mission.latestRunId });
      if (value !== previous) { response.write(`event: mission_update\ndata: ${value}\n\n`); previous = value; }
      else response.write(': heartbeat\n\n');
    };
    publish(); const timer = setInterval(publish, 1000); request.on('close', () => clearInterval(timer));
  });
  router.get('/api/runs/:id', (request, response, next) => { const evidence = read(request.params.id); if (!evidence) { next(); return; } response.json(evidence); });
  for (const [path, feature, key] of [['explain', 'evidence-explanation', 'explanation'], ['shadow-review', 'shadow-review', 'shadow']] as const) {
    router.get(`/api/runs/:id/${path}`, async (request, response) => {
      const evidence = read(request.params.id!);
      if (!evidence?.artifact) { response.status(404).json({ error: 'Run artifact not found.', code: 'not_found' }); return; }
      const artifact = evidence.artifact;
      const result = await services.assistance.explain(feature, {
        source: artifact.testEvidenceSource, baseline: artifact.dossier.baseline, experiments: artifact.dossier.experiments,
        gates: artifact.dossier.qualityGates, criteria: artifact.dossier.criterionEvidence,
        files: artifact.files.slice(0, 12).map(file => ({ added: file.added, deleted: file.deleted, diff: file.diff.slice(0, 2000) })),
      }, bilingual('Inspect the persisted tests, diff and unknown criteria. This advisory does not change any gate or decision.', '請檢視儲存的測試、差異及未知驗收條件；此建議不會改變任何 gate 或決策。'));
      response.json({ [key]: { ...result, ...(key === 'shadow' ? { verdict: 'advisory_only' } : {}), facts: [
        { field: 'artifact.testEvidenceSource', value: artifact.testEvidenceSource },
        { field: 'artifact.files.length', value: artifact.files.length },
        { field: 'dossier.experiments.length', value: artifact.dossier.experiments.length },
      ], caveats: [bilingual('Passing suites do not prove every acceptance criterion. Seed data is not fresh verification.', '測試套件通過不代表每項驗收條件都已證明；seed 資料不是新的驗證。')] } });
    });
  }
  router.post('/api/runs/:id/review', (request, response) => {
    services.epoch();
    const evidence = read(request.params.id);
    if (!evidence?.artifact || !services.reviewability(evidence).reviewable) {
      response.status(400).json({ error: 'Fresh reviewability has not been established for this run.', code: 'not_reviewable' }); return;
    }
    const decision = validateReviewDecision(evidence.run.id, context.bootstrap().currentUser.id, request.body);
    if (decision.comment) decision.comment = redactText(decision.comment);
    const mission = services.repository.decide(evidence.run.missionId, decision);
    response.json({ mission, achievements: [] });
  });
  router.use((_error: unknown, _request: import('express').Request, response: import('express').Response, _next: import('express').NextFunction) => response.status(400).json({ error: 'The local review could not be recorded. Check eligibility and feedback.', code: 'invalid_review' }));
  return router;
};
