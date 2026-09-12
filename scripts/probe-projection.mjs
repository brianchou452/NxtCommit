/** Opt-in local isolated benchmark; no external URL, provider calls or shared data. */
import {createApplication} from '../server/app.ts';
const baseline = process.argv[2];
if (!baseline) throw new Error('Pass a local baseline server/app.ts path');
const {createApplication: previous} = await import(baseline);
async function measure(factory) {
  const app = factory(); const server = app.app.listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/marketplace`;
  const changes=()=>Number(app.context.store.db.prepare('SELECT total_changes() AS n').get().n);
  try {
    for(let i=0;i<20;i++) await (await fetch(url)).arrayBuffer();
    const before=changes(), times=[];
    for(let i=0;i<200;i++) {const start=performance.now();const response=await fetch(url);if(response.status!==200)throw new Error('Probe failure');await response.arrayBuffer();times.push(performance.now()-start);}
    times.sort((a,b)=>a-b);
    return {requests:200,sqliteChanges:changes()-before,p50Ms:+times[99].toFixed(3),p95Ms:+times[189].toFixed(3)};
  } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await app.close();}
}
console.log(JSON.stringify({scope:'local sequential warm marketplace reads, isolated seeded SQLite; not deployed throughput',baseline:await measure(previous),optimized:await measure(createApplication)},null,2));
