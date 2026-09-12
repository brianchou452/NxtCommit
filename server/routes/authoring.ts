import { Router } from 'express';
import type { RouteModule } from './types.js';
import { analyzeRepository } from '../authoring/analyzer.js';
import { bilingual, campaignDraft, selectedIssue } from '../authoring/campaign.js';
import { CapabilityError } from '../persistence/authoring-capabilities.js';
import type { CampaignDraft, RepoAnalysis } from '../../shared/authoring.js';

export const authoringRoutes: RouteModule = context => {
  const router = Router();
  const services = context.authoring;
  if (!services) return router;
  const { capabilities, assistance, repository } = services;
  const snapshot = (body: unknown): RepoAnalysis => capabilities.analysis((body as { analysis?: { serverToken?: unknown } } | null)?.analysis?.serverToken);
  const pair = (body: { analysis?: { serverToken?: unknown }; draft?: { serverToken?: unknown } }) => {
    const analysis = snapshot(body);
    const campaign = capabilities.campaign(body.analysis?.serverToken, body.draft?.serverToken);
    return { analysis, campaign };
  };
  router.post('/api/analyze', async (request, response) => {
    const epoch = services.epoch();
    const analysis = await analyzeRepository(request.body?.source, request.body?.url, services.options.fetcher);
    services.assertEpoch(epoch);
    const trusted: RepoAnalysis = { ...analysis, serverToken: '' };
    const serverToken = capabilities.issueAnalysis(trusted);
    response.json({ analysis: { ...trusted, serverToken } });
  });
  router.post('/api/analysis/assist', async (request, response) => {
    const epoch = services.epoch(); const analysis = snapshot(request.body); const issue = selectedIssue(analysis, request.body?.issueId);
    const assistant = await assistance.explain('issue-triage', { source: analysis.source, issue }, bilingual('Keep the scope tied to this issue. Verify proposed changes independently.', '將範圍限定於此議題，並獨立驗證提議的變更。'));
    services.assertEpoch(epoch); response.json({ assistant: { ...assistant, issueId: issue.id, scope: bilingual(issue.title, `議題範圍：${issue.title}`), criteria: [bilingual('Propose evidence for the selected issue without changing its identity.', '為所選議題提出證據，不改變議題識別。')] } });
  });
  router.post('/api/campaigns/generate', async (request, response) => {
    const epoch = services.epoch(); const analysis = snapshot(request.body); const issue = selectedIssue(analysis, request.body?.issueId);
    const mode: unknown = request.body?.mode;
    if (mode !== undefined && mode !== 'openai' && mode !== 'demo') throw new Error('invalid_mode');
    const result = await assistance.explain('campaign-generation', { source: analysis.source, issue }, bilingual(`A local proposal for: ${issue.title}`, `本機提案：${issue.title}`), mode);
    services.assertEpoch(epoch);
    const draft: CampaignDraft = { ...campaignDraft(analysis, issue, result), serverToken: '' };
    const serverToken = capabilities.issueCampaign(request.body.analysis.serverToken, draft);
    response.json({ draft: { ...draft, serverToken } });
  });
  router.post('/api/campaigns/critique', async (request, response) => {
    const epoch = services.epoch(); const { analysis, campaign } = pair(request.body ?? {});
    const critique = await assistance.explain('campaign-critic', { source: analysis.source, title: campaign.draft.title, criteria: campaign.draft.criteria }, bilingual('Check issue grounding, actionable criteria and bilingual parity. This advice does not change the draft or its estimate.', '請檢查議題依據、可執行的驗收條件及雙語一致性；建議不會修改草稿或估算。'));
    services.assertEpoch(epoch); response.json({ critique: { ...critique, checks: (['grounding', 'actionability', 'bilingual_parity'] as const).map(kind => ({ kind, status: 'needs_review', explanation: bilingual('This advisory does not certify the draft. Compare it with the selected issue and both languages.', '此建議不構成草稿認證，請對照所選議題與兩種語言。') })) } });
  });
  router.post('/api/missions', (request, response) => {
    services.epoch(); const { analysis } = pair(request.body ?? {});
    const missionId = capabilities.bindMission(request.body.analysis.serverToken, request.body.draft.serverToken, draft => repository.create(analysis, draft).id);
    response.json({ mission: repository.get(missionId) });
  });
  router.post('/api/ai/feedback', async (request, response) => response.json(await assistance.feedback(request.body)));
  router.get('/api/llm/validate', async (_request, response) => response.json(await assistance.validate()));
  router.get('/api/projects/:id/explain', async (request, response) => {
    const mission = repository.byProject(request.params.id);
    if (!mission) { response.status(404).json({ error: 'Project not found.', code: 'not_found' }); return; }
    const explanation = await assistance.explain('project-explanation', { description: mission.project.description }, mission.project.description);
    response.json({ plain: { generator: explanation.evidence.generator, emoji: '◈', oneLiner: explanation.summary, useCases: [], technicalSummary: mission.project.description, evidence: explanation.evidence },
      impact: { generator: 'demo', dataMode: 'demo', headline: mission.story.whoBenefits, consequences: [], basis: 'editorial' },
      timeline: [ { kind: 'past', label: 'Local proposal', note: 'No upstream history is inferred.' }, { kind: 'present', label: mission.status, note: 'Current local mission state.' }, { kind: 'future', label: 'Unverified outcome', note: 'No future execution or publication is promised.' } ],
    });
  });
  router.use((error: unknown, _request: import('express').Request, response: import('express').Response, _next: import('express').NextFunction) => {
    response.status(400).json({ error: error instanceof CapabilityError ? error.message : 'The authoring request could not be completed. Check the input and retry.', code: error instanceof CapabilityError || (error instanceof Error && error.message === 'capability_expired') ? 'capability_expired' : 'invalid_authoring_request' });
  });
  return router;
};
