import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RepoAnalysis, ObservedIssue } from '../../shared/authoring.js';

export const PUBLIC_PROBE = 'https://github.com/PrimeIntellect-ai/prime-agent';
export function publicRepository(value: unknown): { owner: string; repo: string; url: string } {
  if (typeof value !== 'string' || value.length > 200) throw new Error('invalid_repository');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash) throw new Error('invalid_repository');
  const match = /^\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_.-]+)\/?$/.exec(url.pathname);
  if (!match || match[2] === '.' || match[2] === '..') throw new Error('invalid_repository');
  const owner = match[1]!; const repo = match[2]!.replace(/\.git$/, '');
  if (!repo) throw new Error('invalid_repository');
  return { owner, repo, url: `https://github.com/${owner}/${repo}` };
}

export function redactText(input: string): string {
  return input.replace(/(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{12,}|Bearer\s+[^\s"<>]+|(?:api[_-]?key|password|secret|token)["']?\s*[:=]\s*["']?[^\s,;"'<>]+)/gi, '[REDACTED]');
}
export function redactEvidence(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[BOUNDED]';
  if (typeof value === 'string') return redactText(value).slice(0, 4000);
  if (Array.isArray(value)) return value.slice(0, 50).map(item => redactEvidence(item, depth + 1));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0, 50).map(([key, item]) => [redactText(key).slice(0, 100), /(?:api.?key|password|secret|token|authorization|cookie)/i.test(key) ? '[REDACTED]' : redactEvidence(item, depth + 1)]));
  return value;
}
const bounded = (value: unknown, max = 4000): string => typeof value === 'string' ? redactText(value.slice(0, max)) : '';

export async function boundedJson(response: Response, limit = 128_000): Promise<unknown> {
  if (!response.ok || !response.body) throw new Error('remote_unavailable');
  const reader = response.body.getReader(); let length = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const result = await reader.read(); if (result.done) break;
      length += result.value.length;
      if (length > limit) throw new Error('response_too_large');
      chunks.push(result.value);
    }
  } finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function analyzeRepository(source: unknown, inputUrl: unknown, fetcher: typeof fetch = fetch): Promise<Omit<RepoAnalysis, 'serverToken'>> {
  if (source === 'fixture') {
    const directory = resolve('server/authoring/fixture');
    const record = JSON.parse(readFileSync(resolve(directory, 'repository.json'), 'utf8')) as { name: string; description: string; language: string; issues: Array<Omit<ObservedIssue, 'feasibility'>> };
    // Count actual bundled input files. No previous test result is inferred from their presence.
    const files = readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isFile()).length;
    return { source, repoUrl: `fixture://${record.name}`, name: record.name, description: record.description, language: record.language, files,
      measured: { metadata: true, filesystem: true, testsExecuted: false, fullTree: true },
      issues: record.issues.map(issue => ({ ...issue, feasibility: { executable: true, basis: 'Bundled fixture input; execution requires the separate runner capability.' } })) };
  }
  if (source !== 'github') throw new Error('invalid_source');
  const identity = publicRepository(inputUrl);
  const root = `https://api.github.com/repos/${identity.owner}/${identity.repo}`;
  const get = (url: string) => fetcher(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'NxtCommit-public-analysis' }, redirect: 'error', signal: AbortSignal.timeout(10_000) }).then(response => boundedJson(response));
  const [repoValue, issuesValue] = await Promise.all([get(root), get(`${root}/issues?state=open&per_page=5`)]);
  const repo = repoValue as Record<string, unknown>;
  if (!repo || repo.private !== false || typeof repo.name !== 'string' || !Array.isArray(issuesValue)) throw new Error('invalid_public_metadata');
  const issues: ObservedIssue[] = issuesValue.filter(item => item && typeof item === 'object' && !item.pull_request && Number.isSafeInteger(item.number)).slice(0, 12).map(item => ({
    id: String(item.number), title: bounded(item.title, 200), body: bounded(item.body), url: `${identity.url}/issues/${item.number}`,
    labels: Array.isArray(item.labels) ? item.labels.slice(0, 10).map((label: { name?: unknown }) => bounded(label.name, 40)) : [],
    feasibility: { executable: false, basis: 'Public metadata only; no clone, full-tree inspection or test execution.' },
  }));
  let commitSha: string | undefined;
  if (typeof repo.default_branch === 'string') {
    try {
      const commit = await get(`${root}/commits/${encodeURIComponent(repo.default_branch)}`) as { sha?: unknown };
      if (typeof commit.sha === 'string' && /^[a-f0-9]{40}$/.test(commit.sha)) commitSha = commit.sha;
    } catch { /* Commit observation is optional, never invented. */ }
  }
  return { source, repoUrl: identity.url, name: bounded(repo.name, 100), description: bounded(repo.description), issues,
    measured: { metadata: true, filesystem: false, testsExecuted: false, fullTree: false },
    ...(typeof repo.language === 'string' ? { language: bounded(repo.language, 80) } : {}),
    ...(Number.isSafeInteger(repo.stargazers_count) && Number(repo.stargazers_count) >= 0 ? { stars: Number(repo.stargazers_count) } : {}),
    ...(commitSha ? { commitSha } : {}),
  };
}
