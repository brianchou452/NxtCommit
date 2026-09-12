// Bounded live smoke: 12 paid calls on authored public examples; no customer data.
// Run from the application root after build, with OPENAI_API_KEY in the environment.
const { Assistance } = await import(`${process.cwd()}/dist-server/server/authoring/assistance.js`);
if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required for this explicit live probe.');
const cases = [
['issue-triage', {source:'fixture',issue:{id:'2',title:'Trim leading and trailing whitespace in CSV headers',body:'CSV uploads with padded header names fail column lookup; retain whitespace inside quoted values.'}}],
['campaign-generation', {source:'fixture',issue:{id:'2',title:'Trim leading and trailing whitespace in CSV headers',body:'CSV uploads with padded header names fail column lookup; retain whitespace inside quoted values.'}}],
['campaign-critic', {source:'fixture',issue:{title:'Trim CSV headers without changing quoted values'},title:{en:'Normalize CSV headers','zh-TW':'正規化 CSV 標頭'},criteria:[{en:'CSV works correctly','zh-TW':'CSV 正常運作'}]}],
['evidence-explanation', {source:'authored-demo',testEvidenceSource:'demo',measured:false,criteria:[{id:'header-trimming',status:'unknown'}],tests:[{name:'trim headers',status:'passed',source:'authored-demo'}]}],
['shadow-review', {source:'authored-demo',affectedGate:false,diff:'- const headers = row.split(",");\n+ const headers = row.trim().split(",");',criteria:[{description:'Trim each header while preserving quoted values',status:'unknown'}]}],
['project-explanation', {source:'fixture',description:{en:'A CSV utility that parses tabular files and normalizes column headers.','zh-TW':'解析表格檔案並正規化欄位標頭的 CSV 工具。'},adoptionMeasured:false}],
];
for(let round=0;round<2;round++) for(const [feature,facts] of cases){
 const service=new Assistance({apiKey:process.env.OPENAI_API_KEY, model:process.env.OPENAI_MODEL||'gpt-5-mini',baseUrl:'https://api.openai.com/v1',api:'responses'});
 const result=await service.explain(feature,facts,{en:'Static fallback','zh-TW':'靜態備援'});
 console.log(JSON.stringify({round,feature,...result}));
}
