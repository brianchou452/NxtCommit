import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './test-support/http.js';

/**
 * Spec: api.bootstrap
 * Scenario: bootstrap-reports-server-resolved-execution-state
 * Given 伺服器已使用目前設定的 execution mode 啟動
 * When 用戶端請求 GET /api/bootstrap
 * Then 回應包含本機 persona、configured 與 resolved mode、量測到的 isolation 狀態，且不含 credential
 */
test('bootstrap-reports-server-resolved-execution-state', async () => {
  for (const configuredMode of ['auto', 'demo', 'llm', 'codex']) {
    const server = await startTestServer({ configuredMode });
    try {
      const response = await fetch(`${server.url}/api/bootstrap`);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.currentUser.id, 'demo-contributor');
      assert.equal(body.currentUser.walletBalance, 10000);
      assert.deepEqual(body.personas.contributor, body.currentUser);
      assert.equal(body.execution.configured, configuredMode);
      assert.equal(body.execution.resolved, ['auto', 'demo'].includes(configuredMode) ? 'demo' : null);
      assert.equal(body.execution.llmValidated, false);
      assert.equal(body.execution.langfuseEnabled, false);
      assert.equal(body.execution.isolation.osIsolated, false);
      if (['llm', 'codex'].includes(configuredMode)) assert.ok(body.execution.error);
      assert.equal(body.execution.gatewayHost, undefined);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    } finally { await server.stop(); }
  }
});
