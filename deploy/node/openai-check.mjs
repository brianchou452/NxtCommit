import {timingSafeEqual} from 'node:crypto';
export function createOpenAICheck(call, env = process.env) {
 let pending;
 return async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  const expected = env.OPENAI_CHECK_TOKEN;
  const provided = request.headers.authorization?.replace(/^Bearer /, '');
  if (!expected || !provided || Buffer.byteLength(provided) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
   response.writeHead(404);response.end();return;
  }
  if (request.method !== 'POST') {response.writeHead(405,{Allow:'POST'});response.end();return;}
  // Fixed prompt; no user input; concurrent/repeated probes share one provider call per process.
  pending ??= call('Reply with exactly OK.', 'connection-check-v1').then(result => ({ok:true,...result.provenance}), error => ({ok:false,code:error.code ?? 'openai_check_failed',status:error.status}));
  const result = await pending;
  response.writeHead(result.ok ? 200 : 502, {'Content-Type':'application/json'});
  response.end(JSON.stringify(result));
 };
}
