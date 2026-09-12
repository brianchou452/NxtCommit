/** Explicit live test: creates only temporary analysis/draft capabilities, never a mission/reset. */
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
if(existsSync('.env'))process.loadEnvFile('.env');
let local;
let base = process.argv[2];
if(!base) {
  const {startTestServer}=await import('../server/test-support/http.ts');
  const {authoringConfiguration}=await import('../server/authoring/configuration.ts');
  local=await startTestServer({authoring:authoringConfiguration(process.env)});base=local.url;
}
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base) && base!=='https://hackathon.ianjuan.com')throw new Error('Unsupported test origin');
async function post(path,body) {
  const response=await fetch(base+path,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal(response.status,200);return response.json();
}
try {
  const {analysis}=await post('/api/analyze',{source:'fixture'});
  const payload={analysis,issueId:analysis.issues[0].id};
  const {draft}=await post('/api/campaigns/generate',payload);
  assert.equal(draft.generator,'openai',JSON.stringify(draft.evidence));
  assert.ok(draft.evidence.responseId);assert.ok(draft.evidence.usage?.totalTokens>0);
  const repeated=await post('/api/campaigns/generate',payload);
  assert.equal(repeated.draft.evidence.cached,true);
  assert.equal(repeated.draft.evidence.responseId,draft.evidence.responseId);
  const {assistant}=await post('/api/analysis/assist',payload);
  assert.equal(assistant.evidence.generator,'openai');assert.equal(assistant.affectedGate,false);
  console.log(JSON.stringify({scope:local?'isolated-local-product':'cloud-product',draft:draft.evidence,advice:assistant.evidence,repeatedCallCached:true},null,2));
} finally {if(local)await local.stop();}
