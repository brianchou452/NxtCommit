import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {startTestServer} from './test-support/http.js';
import {request} from './test-support/authoring.js';
import type {MissionDetail} from '../shared/mission.js';
import type {RepoAnalysis,CampaignDraft} from '../shared/authoring.js';
import {adapt} from '../src/commoncommit/src/lib/nxtAdapter.js';

test('source tempo scenario records actual failed attempt, revised green suite, approved local release and receipt',async()=>{
 process.env.DEMO_SPEED="0";
 const s=await startTestServer();
 try {
  const {analysis}=await request<{analysis:RepoAnalysis}>(s.url,'/api/analyze',{source:'fixture',url:'fixture://tempo'});
  const {draft}=await request<{draft:CampaignDraft}>(s.url,'/api/campaigns/generate',{analysis,issueId:'142',mode:'demo'});
  const {mission}=await request<{mission:MissionDetail}>(s.url,'/api/missions',{analysis,draft});
  await request(s.url,`/api/missions/${mission.id}/release`,{},400);
  await request(s.url,`/api/missions/${mission.id}/pledge`,{amount:mission.computeGoal});
  let detail:MissionDetail=await request(s.url,`/api/missions/${mission.id}`);
  for(let i=0;i<200&&detail.latestRun?.status==='running';i++){await delay(25);detail=await request(s.url,`/api/missions/${mission.id}`);}
  assert.equal(detail.status,'needs_review');
  assert.equal(detail.artifact?.dossier.baseline.passed,13);
  assert.ok(detail.artifact!.dossier.experiments[0]!.failed!>0);
  assert.equal(detail.artifact!.dossier.experiments.at(-1)!.failed,0);
  assert.equal(detail.artifact!.dossier.experiments.at(-1)!.passed,20);
  const view=adapt(`/missions/${detail.id}`,detail);
  assert.equal(view.artifact.testEvidence.pass,20);
  assert.equal(view.runs[0].attempt,2);
  await request(s.url,`/api/runs/${detail.latestRun!.id}/review`,{decision:'request_changes',comment:'Cover malformed input and generous whitespace.'});
  await request(s.url,`/api/missions/${mission.id}/execute`,{});
  for(let i=0;i<200;i++){await delay(25);detail=await request(s.url,`/api/missions/${mission.id}`);if(detail.latestRun?.status!=='running')break;}
  assert.equal(detail.status,'needs_review');
  assert.equal(detail.artifact!.dossier.experiments.at(-1)!.passed,23);
  assert.ok(detail.artifact!.files.some(f=>f.path==='test/edge-cases.test.mjs'));
  await request(s.url,`/api/runs/${detail.latestRun!.id}/review`,{decision:'approve'});
  const result=await request<{mission:MissionDetail}>(s.url,`/api/missions/${mission.id}/release`,{});
  assert.equal(result.mission.status,'released');assert.match(result.mission.releaseVersion!,/demo/);
  assert.deepEqual(await request(s.url,`/api/missions/${mission.id}/release`,{}),result);
  assert.equal(s.context.store.db.prepare("SELECT count(*) n FROM b_records WHERE kind='local-release'").get()!.n,1);
  await request(s.url,'/api/missions/catalog-mermaid/release',{},400);
 } finally {await s.stop();}
});
test('presentation adapter preserves unknown amounts and real ledger identity',()=>{
 const profile=adapt('/contributors/demo',{stats:{localReleases:0},pledges:[],receipts:[],achievements:[]});
 assert.equal(profile.stats.creditsConsumed,undefined);
 assert.equal(profile.stats.shipped,0);
});
