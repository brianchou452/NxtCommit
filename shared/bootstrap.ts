import type { LocalizedText } from './primitives.js';
import type { ExecutionMode } from './execution.js';

export interface Contributor {
  id: string;
  name: string;
  handle: string;
  avatarColor: string;
  bio: LocalizedText;
  walletBalance: number;
  totalPledged: number;
  reputation: number;
  joinedAt: string;
  isCurrentUser?: boolean;
}
export interface Maintainer {
  id: string;
  name: string;
  handle: string;
  avatarColor: string;
  verified: boolean;
  role: LocalizedText;
}
interface ExecutionCapabilityBase {
  configured: 'auto' | ExecutionMode;
  model?: string;
  gatewayHost?: string;
  llmValidated: boolean;
  langfuseEnabled: boolean;
  isolation: { kind: 'container' | 'process'; osIsolated: boolean; detail: string };
}
export type ExecutionCapability = ExecutionCapabilityBase & (
  | { resolved: null; error: string }
  | { resolved: ExecutionMode; error?: never }
);
export interface BootstrapSnapshot {
  currentUser: Contributor;
  personas: { contributor: Contributor; maintainers: Maintainer[] };
  execution: ExecutionCapability;
}
