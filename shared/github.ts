export interface GithubFile { path: string; mode: string; sha: string; content: string | null; bytes: number }
export interface GithubWorkspace {
  id: string; ownerId: number; repository: string; base: string; commit: string; tree: string;
  files: GithubFile[]; changes: Record<string, string>; revision: number;
  analysis: { files: number; bytes: number; extensions: Record<string, number>; dependencies: string[] };
  phase?: 'draft' | 'running' | 'verified' | 'awaiting_ci' | 'ready' | 'failed'; error?: string; run?: { baseline: { exitCode: number; tests: number; output: string }; final: { exitCode: number; tests: number; output: string }; provenance: { generator: string; model: string; promptVersion: string; responseId: string; usage: { inputTokens: number; outputTokens: number; totalTokens: number } | null } };
  lastFailure?: GithubWorkspace['run'];
  missionId?: string; title?: string; pledged?: number; prNodeId?: string; ready?: boolean; implementationCommit?: string;
  branch?: string; publishedCommit?: string; prUrl?: string;
}
