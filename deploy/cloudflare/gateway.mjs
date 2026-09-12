import {hasExpired} from '../shutdown-policy.mjs';
export default {
  async scheduled(_event, env, ctx) {
    if (hasExpired()) return;
    if (!env.OPENAI_CHECK_TOKEN) throw Error('assurance_operator_token_missing');
    ctx.waitUntil((async () => {
      const response = await env.NXTCOMMIT.getByName('hackathon').fetch(new Request('https://internal/api/assurance/run', {
        method: 'POST', headers: {Authorization: `Bearer ${env.OPENAI_CHECK_TOKEN}`, 'X-Assurance-Trigger': 'scheduled'},
      }));
      if (!response.ok) throw Error('assurance_dispatch_failed');
      const run = await response.json();
      if (!['passed', 'blocked'].includes(run.status)) throw Error('assurance_cycle_failed');
      console.log(JSON.stringify({event: 'assurance_cycle', id: run.id, status: run.status, modelCalls: run.modelCalls}));
    })());
  },
  async fetch(request, env) {
    if (hasExpired()) return new Response('This hackathon deployment has closed. / 本次黑客松展示已結束。', {status: 410, headers: {'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8'}});
    if (new URL(request.url).pathname === '/__container-status') {
      if (request.method !== 'GET') return new Response(null, {status: 405});
      try {
        const state = await env.NXTCOMMIT.getByName('hackathon').getState();
        return Response.json({status: state.status, lastChange: state.lastChange}, {headers: {'Cache-Control': 'no-store'}});
      } catch { return Response.json({status: 'unknown'}, {status: 503}); }
    }
    // A single named instance keeps this demo's SQLite state coherent.
    try { return await env.NXTCOMMIT.getByName('hackathon').fetch(request); }
    catch { return Response.json({error: 'Application temporarily unavailable', code: 'container_unavailable'}, {status: 503, headers: {'Cache-Control': 'no-store', 'Retry-After': '10'}}); }
  },
};
