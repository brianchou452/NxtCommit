/** Translate presentation contracts only. NxtCommit remains the sole data authority. */
import { commitmentBadges } from '../../../../shared/commitment.js';
import { en } from '../../../i18n/en.js';
import { zhTW } from '../../../i18n/zh-TW.js';
// Wire records are validated by the owning NxtCommit API and adapted at this boundary.
type Row = Record<string, any>;
const bilingual = (en: string, zh: string) => ({ en, 'zh-TW': zh });
const unknown = bilingual('Not measured', '尚未量測');
const defs = commitmentBadges.map((b: any) => ({ ...b, name: {en: (en as any)[`commitment_badge_${b.code}`], 'zh-TW': (zhTW as any)[`commitment_badge_${b.code}`]}, description: {en:(en as any)[`commitment_badge_${b.code}_desc`], 'zh-TW':(zhTW as any)[`commitment_badge_${b.code}_desc`]} }));
export function event(e: Row): Row {
 const p=e.payload ?? {};
 const types:Record<string,string>={'test-result':'test_result','file-change':'file_change','diff':'file_change','guard':'quality_check','terminal':'run_finished','accounting':'budget','review-feedback':'feedback'};
 const tests=p.tests ?? (p.passed!==undefined ? p : undefined);
 const files=p.files?.map((f:any)=>typeof f==='string'?{path:f,kind:'modify'}:{...f,kind:f.kind ?? 'modify',additions:f.added ?? f.additions,deletions:f.deleted ?? f.deletions});
 return {...e,type:types[e.type] ?? e.type,title:p.title ?? p.message ?? e.type,detail:p.detail,
  payload:{...p,...(files?{files}:{}),...(tests?{tests:{...tests,pass:tests.passed ?? tests.pass,fail:tests.failed ?? tests.fail}}:{})},source:e.source,verified:e.verified,computeDelta:e.computeDelta};
}
export function artifact(a: Row | undefined, missionId: string, run?: Row): Row | undefined {
 if(!a) return undefined;
 const tests=a.dossier?.experiments?.at(-1) ?? a.dossier?.baseline;
 const summary=(x: Row = {})=>({...x,pass:x.passed,fail:x.failed,total:x.total});
 return {...a, missionId, branch:`local/${a.runId}`, title:bilingual('Local review artifact','本機審查產物'), summary:a.review?.summary ?? unknown,
  risks:a.dossier?.criterionEvidence?.filter((x:Row)=>x.status!=='supported').map((x:Row)=>x.explanation) ?? [],
  files:a.files.map((f:Row)=>({...f,kind:'modify',patch:f.diff,additions:f.added,deletions:f.deleted})),
  testEvidence:summary(tests), commands:(a.dossier?.experiments ?? []).map((x:Row)=>({command:x.command,exitCode:x.exitCode})),
  additions:a.files.reduce((n:number,f:Row)=>n+f.added,0),deletions:a.files.reduce((n:number,f:Row)=>n+f.deleted,0),
  createdAt:run?.endedAt ?? run?.startedAt, mode:run?.mode ?? 'demo',
  verification:{experiments:[...(a.dossier?.baseline?[{...a.dossier.baseline,phase:'baseline'}]:[]),...(a.dossier?.experiments ?? []).map((x:Row)=>({...x,phase:'agent_attempt'}))].map(x=>({...x,tests:summary(x),source:a.testEvidenceSource})),
   qualityGates:(a.dossier?.qualityGates ?? []).map((g:Row)=>({key:g.id,passed:g.status==='passed',detail:g.reason})),criteria:(a.dossier?.criterionEvidence ?? []).map((c:Row,i:number)=>({id:String(i),status:c.status==='supported'?'suite_passed':'pending'}))},
  review:{by:a.review?.source ?? 'static',verdict:'concerns',notes:a.review?.summary ?? unknown,unverified:[]}};
}
export function mission(m: Row): Row {
 const c=m.catalog;
 return {...m, projectId:m.projectId ?? m.project.id, tagline:m.tagline ?? m.title,
 project:{...m.project, slug:m.project.slug.replace(/^catalog-/,''),usedByYou:m.project.usedByYou ?? false,maintainer:{handle:'demo-maintainer',avatarColor:'#6657ff',role:bilingual('Demo maintainer','示範維護者'),...m.project.maintainer},workspace:m.project.workspace ?? {kind:'none'}},
 issueRef:c?.issue ?? {id:m.draft?.issueId ?? m.id,title:m.title},riskLevel:c?.riskLevel ?? 'medium',riskFactors:c?.riskFactors ?? (m.draft?[m.draft.risk]:[]),
 tags:m.tags ?? [], createdAt:m.createdAt, computeReserved:m.computeReserved ?? 0,computeConsumed:m.computeConsumed ?? 0,
 acceptanceCriteria:(m.acceptanceCriteria ?? []).map((x:Row)=>({...x,status:x.status==='supported'?'suite_passed':'pending'})),milestones:m.milestones ?? [],
 executionMode:m.latestRun?.mode ?? null,backerCount:m.backerCount ?? new Set((m.pledges ?? []).map((p:Row)=>p.contributorId)).size,
 runs:m.latestRun?[{...m.latestRun,attempt:m.artifact?.dossier?.experiments.length ?? 1,maxAttempts:m.project.workspace?.path==='tempo'?2:1}]:[],ledger:(m.ledger ?? []).map((l:Row)=>({...l,ts:l.createdAt,memo:l.type})),
 pledges:(m.pledges ?? []).map((p:Row)=>({...p,contributor:p.contributor ?? {id:p.contributorId,handle:p.contributorId,name:p.contributorId,avatarColor:'#6657ff'}})),
 reviews:m.reviewDecision?[{...m.reviewDecision,maintainerId:m.reviewDecision.reviewerId}]:[],artifact:artifact(m.artifact,m.id,m.latestRun),
 ...(c?.releaseVersion?{releaseVersion:c.releaseVersion,releasedAt:c.releasedAt}:{}),
 ...(c?.adoption?{adoption:{...c.adoption,series:c.adoption.series ?? []}}:{})};
}
export function adapt(path: string, body: Row): Row {
 if(path==='/marketplace')return {...body,sections:body.sections.map((s:Row)=>({...s,missions:s.missions.map(mission)}))};
 if(/^\/missions\/[^/]+$/.test(path))return mission(body.mission ?? body);
 if(path.endsWith('/pledge'))return {...body,mission:mission(body.mission),achievements:(body.achievements ?? []).map((a:Row)=>({...a,def:a.def ?? defs.find(d=>d.code===a.code)})).filter((a:Row)=>a.def)};
 if(path.match(/^\/runs\/[^/]+$/)) return {...body,run:{...body.run,attempt:body.artifact?.dossier?.experiments.length ?? Math.max(1,...(body.events ?? []).map((e:Row)=>e.payload?.attempt ?? 1)),maxAttempts:body.artifact?.dossier?.experiments.length ?? 2},events:(body.events ?? []).map(event),artifact:artifact(body.artifact,body.run.missionId,body.run)};
 if(path.includes('/events'))return {...body,events:(body.events ?? []).map(event)};
 if(path==='/live')return {...body,activities:(body.activities ?? []).map((a:Row)=>({...a,evidence:a.evidence ?? [],label:a.label ?? a.phase}))};
 if(path.match(/^\/contributors\//))return {...body,stats:{...body.stats,shipped:body.stats.localReleases},
  pledges:body.pledges.map((p:Row)=>({...p,missionTitle:p.mission.title,projectName:p.mission.project.name,missionStatus:p.mission.status})),
  achievements:body.achievements.map((a:Row)=>({...a,def:defs.find(d=>d.code===a.code)})).filter((a:Row)=>a.def),receipts:body.receipts.map((r:Row)=>({...r,achievements:r.achievements ?? []}))};
 if(path.endsWith('/wall'))return {...body,messages:body.messages.map((m:Row)=>({...m,authorRole:'sponsor',authorHandle:m.handle,authorColor:'#6657ff'}))};
 if(path==='/mvp'||path.startsWith('/mvp/'))return {...body,nominees:body.nominees.map((n:Row)=>({...n,basis:undefined}))};
 if(path==='/analyze'){
  const a=body.analysis;
  return {analysis:{...a,healthNotes:[bilingual('Observed repository metadata; feasibility remains advisory.','已讀取專案資料；可行性僅供參考。')], measured:{filesystem:a.measured.filesystem,popularity:false,hostMetadata:a.measured.metadata},
   issues:a.issues.map((i:Row)=>({...i,feasibility:{level:i.feasibility.executable?'high':'low',by:'heuristic',needsHuman:!i.feasibility.executable,signals:[],observations:[{key:'scope',note:i.feasibility.basis}],calibration:{},score:undefined}}))}};
 }
 if(path==='/campaigns/generate'){
  const d=body.draft;return {draft:{...d,sourceIssueId:d.issueId,acceptanceCriteria:d.criteria,milestones:d.milestones.map((m:Row)=>({...m,share:m.allocation/100})),riskLevel:'medium',riskFactors:[d.risk],computeGoal:d.estimate.total,computeRationale:d.estimate.basis,
    computeEstimate:{version:'nxtcommit',method:d.estimate.basis,total:d.estimate.total,range:{low:d.estimate.low,high:d.estimate.high},confidence:d.estimate.confidence,inputs:{repositoryMeasurement:'unknown'},breakdown:d.estimate.breakdown.map((x:Row)=>({key:'base',credits:x.credits,basis:x.label})),calibration:{sampleSize:0,multiplier:1},caveats:[d.estimate.basis]}}};
 }
 if(path==='/analysis/assist') {const a=body.assistant;return {assistant:{triage:{type:'unknown',summary:a.summary,ambiguity:'medium',affectedSurface:[],missingContext:[],maintainerQuestions:a.caveats ?? []},criteria:(a.criteria ?? []).map((text:unknown)=>({text,needsMaintainerDecision:true})),evidence:aiEvidence(a.evidence)}};}
 if(path==='/campaigns/critique'){const a=body.critique;return {critique:{grounding:'needs_revision',actionability:'needs_revision',bilingualParity:'needs_revision',findings:[a.summary],suggestedCriteria:[],evidence:aiEvidence(a.evidence)}};}
 if(path.endsWith('/explain')&&path.startsWith('/runs/')){const a=body.explanation;return {explanation:{summary:a.summary,verifiedFacts:[],openQuestions:a.caveats ?? [],evidence:aiEvidence(a.evidence)}};}
 if(path.endsWith('/shadow-review')){const a=body.shadow;return {shadow:{verdict:'unavailable',notes:a.summary,risks:a.caveats ?? [],unverified:[],affectedGate:false,evidence:aiEvidence(a.evidence)}};}
 if((path.endsWith('/review')||path.endsWith('/release'))&&body.mission)return {...body,mission:mission(body.mission),achievements:body.achievements ?? []};
 return body;
}
function aiEvidence(e:Row){return {...e,generator:e.generator==='openai'?'openai':'fallback',promptKey:e.promptVersion,promptVersion:1,variant:'control'};}
