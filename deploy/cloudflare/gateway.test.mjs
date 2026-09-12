import test from 'node:test';
import assert from 'node:assert/strict';
import gateway from './gateway.mjs';
test('all paths and methods reach the same application instance, including the image receipt', async () => {
 for (const path of ['/', '/__deployment', '/readyz', '/api/demo/reset']) {
  const request = new Request('https://example.com'+path, {method: path.endsWith('reset') ? 'POST' : 'GET'});
  const response = await gateway.fetch(request, {NXTCOMMIT:{getByName(name) {assert.equal(name,'hackathon');return {fetch(received){assert.equal(received,request);return new Response('from image',{status:201});}};}}});
  assert.equal(response.status,201); assert.equal(await response.text(),'from image');
 }
});
test('unavailable container fails closed without exposing runtime errors', async () => {
 const response = await gateway.fetch(new Request('https://example.com/readyz'),{NXTCOMMIT:{getByName(){throw Error('private data');}}});
 assert.equal(response.status,503);assert.equal(response.headers.get('retry-after'),'10');assert.equal((await response.json()).code,'container_unavailable');
});
test('monitor reads lifecycle without starting or fetching the container', async () => {
 let reads = 0;
 const env = {NXTCOMMIT:{getByName(){return {getState(){reads++;return {status:'stopped',lastChange:123};},fetch(){throw Error('must not wake');}};}}};
 const response = await gateway.fetch(new Request('https://example.com/__container-status'),env);
 assert.deepEqual(await response.json(),{status:'stopped',lastChange:123});
 assert.equal(reads,1);
 assert.equal((await gateway.fetch(new Request('https://example.com/__container-status',{method:'POST'}),env)).status,405);
 assert.equal(reads,1);
});

test('scheduled cycle waits for terminal evidence and sends only the operator capability', async () => {
 let completion;
 await gateway.scheduled({}, {OPENAI_CHECK_TOKEN: 'private-test-token', NXTCOMMIT: {getByName(name) {
  assert.equal(name, 'hackathon'); return {async fetch(request) {
   assert.equal(new URL(request.url).pathname, '/api/assurance/run'); assert.equal(request.method, 'POST');
   assert.equal(request.headers.get('Authorization'), 'Bearer private-test-token');
   assert.equal(request.headers.get('X-Assurance-Trigger'), 'scheduled');
   return Response.json({id:'test',status:'passed',modelCalls:4});
  }};
 }}}, {waitUntil(promise) {completion = promise;}});
 await completion;
});
test('scheduled failure is observable instead of accepted as completed work', async () => {
 let completion;
 await gateway.scheduled({}, {OPENAI_CHECK_TOKEN: 'test', NXTCOMMIT: {getByName() {return {fetch() {return Response.json({status:'failed'});}};}}}, {waitUntil(promise) {completion = promise;}});
 await assert.rejects(completion, /assurance_cycle_failed/);
});
