import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';

/** Fingerprint executable agent inputs without reading credentials or runtime artifacts. */
export function agentSourceHash(): string {
  const files = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? files(resolve(directory, entry.name)) : [resolve(directory, entry.name)],
    );
  const hash = createHash('sha256');
  for (const file of [
    ...files('server'),
    ...files('shared'),
    resolve('package.json'),
    resolve('package-lock.json'),
  ].sort())
    hash.update(relative(process.cwd(), file)).update(readFileSync(file));
  return hash.digest('hex');
}
