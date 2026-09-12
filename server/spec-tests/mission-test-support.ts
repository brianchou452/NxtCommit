import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { startTestServer } from '../test-support/http.js';
import type { MissionOptions } from '../services/mission-services.js';
import { installMissionServices } from '../services/mission-services.js';
import type { ExecutionEvidence } from '../../shared/execution.js';

export async function missionServer(options: MissionOptions = {}) {
  const server = await startTestServer({ configuredMode: 'demo', missionOptions: options });
  const service = installMissionServices(server.context, options);
  return { ...server, service,
    async json(path: string, body?: unknown, headers: Record<string, string> = {}) {
      const response = await fetch(server.url + '/api' + path, body === undefined ? { headers } : { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
      return { status: response.status, body: await response.json() as any };
    },
    async terminal(id: string): Promise<ExecutionEvidence> {
      const deadline = Date.now() + 16000;
      while (Date.now() < deadline) {
        const response = await fetch(server.url + `/api/runs/${id}`); const evidence = await response.json() as ExecutionEvidence;
        if (evidence.run.status !== 'running') { assert.ok(evidence.run.endedAt); return evidence; } await delay(25);
      }
      assert.fail('Accepted dispatch did not reach a persisted terminal outcome within 16 seconds.');
    },
  };
}
