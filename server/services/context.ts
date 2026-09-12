import type { BootstrapSnapshot, ExecutionCapability, ExecutionEvidenceReader } from '../../shared/types.js';
import type { PersistenceAdapter } from '../persistence/database.js';

export interface ServiceContext {
  store: PersistenceAdapter;
  execution: ExecutionCapability;
  bootstrap(): BootstrapSnapshot;
  reset(): Promise<void>;
  /** Installed by B in Phase 2; C must use this port, never B's tables. */
  evidence?: ExecutionEvidenceReader;
}

/** No runner is installed in Phase 1, including a demo runner. */
export function foundationCapability(configured: string | undefined): ExecutionCapability {
  const mode = configured ?? 'auto';
  if (!['auto', 'demo', 'llm', 'codex'].includes(mode)) throw new Error('Invalid EXECUTION_MODE');
  return {
    configured: mode as ExecutionCapability['configured'], resolved: null,
    error: 'Execution is unavailable: no runner module is registered.',
    llmValidated: false, langfuseEnabled: false,
    isolation: { kind: 'process', osIsolated: false, detail: 'No per-run OS isolation is installed.' },
  };
}
