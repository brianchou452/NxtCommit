// Offline content extraction. Source seed writes are intercepted in memory.
// No source database, credentials, network call, or repository runner is loaded.
import ts from 'typescript';
import vm from 'node:vm';
import * as fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2] ?? '../commoncommit');
const output=path.resolve(process.argv[3] ?? 'server/persistence/commoncommit-catalog.json');
const data={projects:[],missions:[],contributors:[],pledges:[],ledger:[],runs:[],events:[],artifacts:[],wall:[],awards:[]};
let sequence=0;
const newId=prefix=>`${prefix}_${++sequence}`;
const save=(table)=>value=>{const clone=JSON.parse(JSON.stringify(value)); const index=data[table].findIndex(row=>row.id===clone.id); if(index<0)data[table].push(clone);else data[table][index]=clone;};
const allocateCredits=(total,weights)=>{const merged=new Map();for(const {key,weight} of weights)merged.set(key,(merged.get(key)??0)+weight);const denominator=[...merged.values()].reduce((a,b)=>a+b,0);const rows=[...merged].map(([key,weight])=>({key,amount:Math.floor(total*weight/denominator),remainder:total*weight%denominator})).sort((a,b)=>b.remainder-a.remainder||a.key.localeCompare(b.key));let left=total-rows.reduce((a,b)=>a+b.amount,0);for(const row of rows)if(left-->0)row.amount++;return new Map(rows.map(r=>[r.key,r.amount]));};
const store={getMeta:()=>undefined,setMeta:()=>{},wipeAll:()=>{},getContributor:id=>data.contributors.find(c=>c.id===id),listMissions:()=>data.missions,listProjects:()=>data.projects,pledgesForMission:id=>data.pledges.filter(p=>p.missionId===id),allocateCredits,addLedger:value=>save('ledger')({id:newId('ledger'),...value}),award:(contributorId,code,missionId)=>save('awards')({id:newId('award'),contributorId,code,missionId,earnedAt:'2026-09-12T00:00:00.000Z'})};
for(const [method,table] of Object.entries({saveProject:'projects',saveMission:'missions',saveContributor:'contributors',savePledge:'pledges',saveRun:'runs',saveEvent:'events',saveArtifact:'artifacts',saveWallMessage:'wall'}))store[method]=save(table);
const cache=new Map();
function load(file){
 if(cache.has(file))return cache.get(file);
 const exports={};cache.set(file,exports);
 const req=id=>{
  if(id==='node:fs')return fs;if(id==='node:path')return path;
  if(id.endsWith('/db.ts')||id==='./db.ts')return {newId,FIXTURES_DIR:path.join(root,'fixtures')};
  if(id==='./store.ts')return store;
  if(id.includes('logger'))return {logger:{info(){},warn(){},error(){}}};
  if(id.includes('workspace'))return {assertExecutableFixture:name=>{if(name!=='tempo')throw Error('Unexpected fixture')},truncate:(s,n)=>s.slice(0,n)};
  if(id.includes('observedLlm'))return {observedChatComplete:()=>{throw Error('Network generation prohibited')}};
  if(id.includes('env.ts'))return {openaiConfigured:()=>false};
  if(id.includes('feasibility'))return {readFeasibility:()=>({})};
  const target=path.resolve(path.dirname(file),id);
  if(!['server/ai/campaign.ts','server/ai/computeEstimate.ts','server/ai/analyzer.ts'].some(p=>target===path.join(root,p)))throw Error(`Unexpected import ${id}`);
  return load(target);
 };
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 class FixedDate extends Date {constructor(...args){super(...(args.length?args:['2026-09-12T00:00:00.000Z']))}static now(){return Date.parse('2026-09-12T00:00:00.000Z')}}
 vm.runInNewContext(code,{exports,require:req,Date:FixedDate,console:{log(){}}},{filename:file});return exports;
}
await load(path.join(root,'server/seed.ts')).seedIfNeeded();
fs.writeFileSync(output,JSON.stringify({source:'commoncommit/server/seed.ts',revision:'a52346519fa7258a56ec39f70212b243d599e833',capturedAt:'2026-09-12T00:00:00.000Z',...data},null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.length]))));
