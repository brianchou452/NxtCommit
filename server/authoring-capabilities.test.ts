import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuthoringCapabilities, CapabilityError } from './persistence/authoring-capabilities.js';

test('capability snapshots reject forged, mismatched, expired and reset identities', () => {
  let now = 100;
  const capabilities = new AuthoringCapabilities<{ name: string }, { title: string }>(2, 1000, () => now);
  const source = { name: 'observed' };
  const a = capabilities.issueAnalysis(source);
  source.name = 'client edit';
  const copy = capabilities.analysis(a);
  copy.name = 'another edit';
  assert.equal(capabilities.analysis(a).name, 'observed');
  const d = capabilities.issueCampaign(a, { title: 'trusted' });
  const b = capabilities.issueAnalysis({ name: 'other' });
  assert.throws(() => capabilities.campaign(b, d), CapabilityError);
  assert.throws(() => capabilities.analysis('forged'), CapabilityError);
  now = 1100;
  assert.throws(() => capabilities.campaign(a, d), CapabilityError);
  const fresh = capabilities.issueAnalysis({ name: 'fresh' });
  capabilities.clear();
  assert.throws(() => capabilities.analysis(fresh), CapabilityError);
});

test('capacity eviction fails closed and campaign lifetime never extends analysis lifetime', () => {
  let now = 0;
  const capabilities = new AuthoringCapabilities(1, 1000, () => now);
  const a = capabilities.issueAnalysis({ source: 'fixture' });
  now = 999;
  const d = capabilities.issueCampaign(a, {});
  now = 1000;
  assert.throws(() => capabilities.campaign(a, d), CapabilityError);
  const b = capabilities.issueAnalysis({});
  capabilities.issueAnalysis({});
  assert.throws(() => capabilities.analysis(b), CapabilityError);
  assert.throws(() => new AuthoringCapabilities(1, 1_800_001));
});

test('mission binding retries a failed writer but returns one identity after successful creation', () => {
  const capabilities = new AuthoringCapabilities();
  const a = capabilities.issueAnalysis({});
  const d = capabilities.issueCampaign(a, { title: 'trusted' });
  assert.throws(() => capabilities.bindMission(a, d, () => { throw new Error('database unavailable'); }));
  let writes = 0;
  const create = () => { writes++; return 'mission-created'; };
  assert.equal(capabilities.bindMission(a, d, create), 'mission-created');
  assert.equal(capabilities.bindMission(a, d, create), 'mission-created');
  assert.equal(writes, 1);
});
