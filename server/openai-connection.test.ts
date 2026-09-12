import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpenAIResponse,openAIConfiguration} from './services/openai.js';
const env = {OPENAI_API_KEY:'sk-test-only-not-real',OPENAI_MODEL:'gpt-5-mini'};
test('missing credentials refuse without requests and keys are server-only',()=>{
 assert.throws(()=>openAIConfiguration({}),/openai_key_missing/);
 assert.throws(()=>openAIConfiguration({OPENAI_API_KEY:'promotion-code'}),/openai_key_missing/);
});
test('bounded Responses call returns real provider provenance and unknown usage stays unknown',async()=>{
 const result = await createOpenAIResponse('test','connection-v1',{env,fetch:(async(url, options)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options!.body as string);assert.equal(body.store,false);assert.equal(body.max_output_tokens,1024);
  return Response.json({id:'resp-test',status:'completed',model:'gpt-5-mini',output:[{type:'message',content:[{type:'output_text',text:'OK'}]}]});
 }) as typeof fetch});
 assert.equal(result.text,'OK');assert.equal(result.provenance.usage,null);assert.equal(result.provenance.fallback,false);assert.ok(!JSON.stringify(result).includes(env.OPENAI_API_KEY));
});
test('provider failure bodies never escape the boundary',async()=>{
 await assert.rejects(createOpenAIResponse('test','connection-v1',{env,fetch:(async()=>new Response('private provider data',{status:401})) as typeof fetch}),error=>error instanceof Error && error.message==='openai_request_rejected');
});
