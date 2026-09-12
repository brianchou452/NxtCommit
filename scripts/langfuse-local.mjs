import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
const command = process.argv[2] ?? 'status';
if (!['up', 'stop', 'status', 'verify'].includes(command))
  throw Error('Usage: npm run agents:monitor -- up|stop|status|verify [trace-id]');
const directory = resolve('var/langfuse');
mkdirSync(directory, { recursive: true, mode: 0o700 });
const env = join(directory, '.env');
if (!existsSync(env)) {
  const secrets = Object.fromEntries(
    [
      'POSTGRES_PASSWORD',
      'SALT',
      'ENCRYPTION_KEY',
      'CLICKHOUSE_PASSWORD',
      'REDIS_AUTH',
      'MINIO_ROOT_PASSWORD',
      'NEXTAUTH_SECRET',
      'ADMIN_PASSWORD',
    ].map((key) => [key, randomBytes(32).toString('hex')]),
  );
  writeFileSync(
    env,
    Object.entries({
      ...secrets,
      LANGFUSE_PUBLIC_KEY: `pk-lf-${randomBytes(16).toString('hex')}`,
      LANGFUSE_SECRET_KEY: `sk-lf-${randomBytes(32).toString('hex')}`,
      AGENT_TRACING_ENABLED: 'true',
      LANGFUSE_BASE_URL: 'http://127.0.0.1:4310',
    })
      .map(([key, value]) => `${key}=${value}\n`)
      .join(''),
    { mode: 0o600 },
  );
}
if (command === 'verify') {
  process.loadEnvFile(env);
  const latest = existsSync('var/agents/exports.jsonl')
    ? readFileSync('var/agents/exports.jsonl', 'utf8')
        .trim()
        .split('\n')
        .map(JSON.parse)
        .findLast((row) => row.accepted)
    : undefined;
  const traceId = process.argv[3] ?? latest?.traceId;
  if (!/^[a-f0-9]{32}$/.test(traceId ?? '')) throw Error('Run an experiment first, or supply its trace id');
  const query = new URLSearchParams({
    traceId,
    fields: 'core,basic,model,usage,metrics',
    limit: '100',
    fromStartTime: new Date(Date.now() - 86400000).toISOString(),
    toStartTime: new Date().toISOString(),
  });
  const response = await fetch(`http://127.0.0.1:4310/api/public/v2/observations?${query}`, {
    signal: AbortSignal.timeout(5000),
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`).toString('base64')}`,
    },
  });
  const body = await response.json();
  if (!response.ok || !body.data?.length) throw Error('Trace is not yet queryable in Langfuse');
  console.log(
    JSON.stringify(
      {
        traceId,
        persistedObservations: body.data.length,
        observations: body.data.map((row) => ({
          name: row.name,
          type: row.type,
          model: row.model,
          usage: row.usageDetails,
          costEstimateUsd: row.totalCost,
          latencySeconds: row.latency,
        })),
      },
      null,
      2,
    ),
  );
} else {
  const result = spawnSync(
    process.env.SELF_UPDATE_DOCKER ?? join(homedir(), '.docker/bin/docker'),
    [
      '--context',
      process.env.SELF_UPDATE_DOCKER_CONTEXT ?? 'colima',
      'compose',
      '--env-file',
      env,
      '-f',
      'deploy/langfuse/compose.yaml',
      ...(command === 'up' ? ['up', '-d'] : command === 'stop' ? ['stop'] : ['ps']),
    ],
    { stdio: 'inherit' },
  );
  process.exitCode = result.status ?? 1;
}
