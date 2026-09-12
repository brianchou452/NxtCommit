import test from 'node:test';
import assert from 'node:assert/strict';
import {hasExpired,SHUTDOWN_AT} from '../shutdown-policy.mjs';
test('Taipei 01:00 cutoff is enforced inclusively regardless of traffic',()=>{
 assert.equal(new Date(SHUTDOWN_AT).toISOString(),'2026-09-12T17:00:00.000Z');
 assert.equal(hasExpired(SHUTDOWN_AT-1),false);assert.equal(hasExpired(SHUTDOWN_AT),true);
});
