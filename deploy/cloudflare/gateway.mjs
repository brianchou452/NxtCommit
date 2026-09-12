import {hasExpired} from '../shutdown-policy.mjs';
export default {
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
