import assert from 'node:assert/strict';
import { productRequest, ProductError } from '../../src/services/authoring.js';
const original = globalThis.fetch;
const outcomes: Record<string, boolean> = {};
async function check(name: string, response: () => Promise<Response>, verify: () => Promise<void>) {
  globalThis.fetch = response;
  try { await verify(); outcomes[name] = true; } catch { outcomes[name] = false; }
}
try {
  await check('success-preserved', async () => Response.json({ ok: true }), async () => assert.deepEqual(await productRequest('/api/example'), { ok: true }));
  await check('null-success-preserved', async () => Response.json(null), async () => assert.equal(await productRequest('/api/example'), null));
  await check('known-error-preserved', async () => Response.json({ code: 'capability_expired' }, { status: 400 }), async () => assert.rejects(productRequest('/api/example'), (e: unknown) => e instanceof ProductError && e.code === 'capability_expired'));
  await check('null-error-normalized', async () => Response.json(null, { status: 503 }), async () => assert.rejects(productRequest('/api/example'), (e: unknown) => e instanceof ProductError && e.code === 'request_failed'));
  await check('non-json-error-normalized', async () => new Response('<html>Unavailable</html>', { status: 503 }), async () => assert.rejects(productRequest('/api/example'), (e: unknown) => e instanceof ProductError && e.code === 'request_failed'));
  const abort = new DOMException('Stopped', 'AbortError');
  await check('abort-preserved', async () => { throw abort; }, async () => assert.rejects(productRequest('/api/example'), (e: unknown) => e === abort));
} finally { globalThis.fetch = original; }
console.log(JSON.stringify({ dataset: 'frontend-request-resilience-v1', outcomes, passed: Object.values(outcomes).filter(Boolean).length, total: 6 }));
if (!process.argv.includes('--observe')) assert.ok(Object.values(outcomes).every(Boolean), 'Candidate must satisfy every frozen request contract');
