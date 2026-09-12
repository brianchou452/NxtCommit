import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpenAICheck} from '../node/openai-check.mjs';
function response(){return {setHeader(){},writeHead(status){this.status=status;},end(body){this.body=body;}};}
test('connection check rejects unauthenticated requests and shares one bounded call', async()=>{
 let calls=0;
 const check=createOpenAICheck(async(input,version)=>{calls++;assert.equal(input,'Reply with exactly OK.');assert.equal(version,'connection-check-v1');return {text:'secret output',provenance:{generator:'openai',usage:{totalTokens:75}}};},{OPENAI_CHECK_TOKEN:'test-only'});
 const denied=response();await check({headers:{},method:'POST'},denied);assert.equal(denied.status,404);assert.equal(calls,0);
 const wrong=response();await check({headers:{authorization:'Bearer test-only'},method:'GET'},wrong);assert.equal(wrong.status,405);assert.equal(calls,0);
 const a=response(),b=response();await Promise.all([check({headers:{authorization:'Bearer test-only'},method:'POST'},a),check({headers:{authorization:'Bearer test-only'},method:'POST'},b)]);
 assert.equal(calls,1);assert.equal(a.status,200);assert.equal(a.body,b.body);assert.equal(a.body.includes('secret output'),false);
});
