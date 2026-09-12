import type { RepoAnalysis, CampaignDraft, ObservedIssue, AssistantResult } from '../../shared/authoring.js';
import type { LocalizedText } from '../../shared/primitives.js';
export const bilingual = (en: string, zh: string): LocalizedText => ({ en, 'zh-TW': zh });

export function selectedIssue(analysis: RepoAnalysis, id: unknown): ObservedIssue {
  const issue = analysis.issues.find(issue => issue.id === id);
  if (!issue) throw new Error('unknown_issue');
  return issue;
}

export function campaignDraft(analysis: RepoAnalysis, issue: ObservedIssue, assistance: AssistantResult): Omit<CampaignDraft, 'serverToken'> {
  const breakdown = [
    { label: 'planning', credits: 900 },
    { label: 'observed_scope', credits: analysis.files === undefined ? 0 : analysis.files * 40 },
    { label: 'issue_size', credits: Math.ceil(issue.body.length / 5) },
    { label: 'verification_allowance', credits: 1500 },
    { label: 'uncertainty', credits: analysis.source === 'github' ? 900 : 150 },
  ];
  const total = Math.ceil(breakdown.reduce((sum, part) => sum + part.credits, 0) / 50) * 50;
  return {
    issueId: issue.id, title: bilingual(issue.title, `處理議題：${issue.title}`), tagline: assistance.summary,
    story: {
      what: bilingual(analysis.description, `已觀察的專案描述：${analysis.description}`),
      why: bilingual(issue.body, `已觀察的議題內容：${issue.body}`),
      whoBenefits: bilingual('People affected by the selected issue; adoption is not measured.', '受所選議題影響的使用者；未量測採用規模。'),
      approach: bilingual('Review the selected issue and propose bounded changes. Execution eligibility is resolved separately by the server.', '檢視所選議題並提議有限範圍的變更；執行資格由伺服器另行判定。'),
    },
    criteria: [bilingual('Address the selected issue with explicit evidence.', '以明確證據處理所選議題。'), bilingual('Preserve existing behaviour and add relevant verification.', '保留既有行為並補充相關驗證。')],
    milestones: [
      { title: bilingual('Analyze and plan', '分析與規劃'), allocation: 20 },
      { title: bilingual('Propose implementation', '提議實作'), allocation: 55 },
      { title: bilingual('Verify and review', '驗證與檢視'), allocation: 25 },
    ],
    estimate: { total, low: Math.floor(total * .75), high: Math.ceil(total * 1.5), confidence: analysis.source === 'github' ? 'low' : 'high', basis: 'server-heuristic-v2; planning allowance, not provider-billed usage; unavailable filesystem scope contributes no measurement', breakdown },
    risk: bilingual('Partial observations and unverified acceptance criteria remain uncertain.', '部分觀察與尚未驗證的驗收條件仍存在不確定性。'),
    tags: issue.labels, generator: assistance.evidence.generator === 'openai' ? 'openai' : 'demo', evidence: assistance.evidence,
  };
}
