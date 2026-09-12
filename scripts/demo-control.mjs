/** Operator-only controls; reads the ignored local secret without printing it. */
import {existsSync} from 'node:fs';
import {open, mkdir} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
if (existsSync('.env')) process.loadEnvFile('.env');
const [action, base = 'https://hackathon.ianjuan.com', destination] = process.argv.slice(2);
const url = new URL(base);
if (!['https://hackathon.ianjuan.com', 'http://127.0.0.1:4177', 'http://localhost:4177'].includes(url.origin) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('Unsupported deployment origin');
const token = process.env.OPENAI_CHECK_TOKEN;
if (!token || token.length < 24) throw new Error('OPENAI_CHECK_TOKEN is required');
if (!['backup', 'reset'].includes(action) || (action === 'backup' && !destination)) throw new Error('Usage: node scripts/demo-control.mjs backup URL DESTINATION | reset URL');
const response = await fetch(new URL(action === 'backup' ? '/api/demo/backup' : '/api/demo/reset', url), {
  method: action === 'backup' ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(60000), headers: {Authorization: `Bearer ${token}`},
});
if (!response.ok) throw new Error(`Operator action failed (HTTP ${response.status})`);
if (action === 'backup') {
  const path = resolve(destination); await mkdir(dirname(path), {recursive: true, mode: 0o700});
  const file = await open(path, 'wx', 0o600);
  try { await file.writeFile(Buffer.from(await response.arrayBuffer())); } finally { await file.close(); }
  console.log(JSON.stringify({backup: path}));
} else console.log(JSON.stringify({reset: true}));
