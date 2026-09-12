import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
function discover(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? discover(path) : entry.name.endsWith('.test.ts') ? [path] : [];
  });
}
const files = process.argv.slice(2);
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...(files.length ? files : discover('server').sort())], { stdio: 'inherit' });
process.exit(result.status ?? 1);
