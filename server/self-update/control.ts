import { mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, existsSync, symlinkSync, readlinkSync, lstatSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export const defaultGoal = 'Improve productRequest failure handling for null and non-JSON HTTP error responses. Preserve successful response payloads, structured server codes and AbortError identity. If already satisfied, return no edits.';
export interface UpdateSettings { enabled: boolean; demoLocked: boolean; epoch: string; goal: string }
export const defaults = (): UpdateSettings => ({ enabled: false, demoLocked: true, epoch: randomUUID(), goal: defaultGoal });
export function atomicJson(path: string, value: unknown) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' }); renameSync(temporary, path);
}
export class UpdateControl {
  readonly root: string;
  constructor(root: string) { this.root = resolve(root); mkdirSync(this.root, { recursive: true, mode: 0o700 }); }
  async locked<T>(work: () => T | Promise<T>): Promise<T> {
    const path = join(this.root, 'control.lock');
    for (let attempt = 0; ; attempt++) {
      try { mkdirSync(path); break; } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || attempt >= 200) throw new Error('control_busy');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    try { return await work(); } finally { rmSync(path, { recursive: true }); }
  }
  read(): UpdateSettings {
    const path = join(this.root, 'settings.json');
    if (!existsSync(path)) return { enabled: false, demoLocked: true, epoch: 'uninitialized', goal: defaultGoal };
    const value = JSON.parse(readFileSync(path, 'utf8')) as UpdateSettings;
    if (typeof value.enabled !== 'boolean' || typeof value.demoLocked !== 'boolean' || typeof value.epoch !== 'string' || typeof value.goal !== 'string' || !value.goal.trim() || value.goal.length > 2000) throw new Error('invalid_settings');
    return value;
  }
  async change(change: Partial<Pick<UpdateSettings, 'enabled' | 'demoLocked' | 'goal'>>): Promise<UpdateSettings> {
    return this.locked(() => { const value = { ...this.read(), ...change, epoch: randomUUID() }; atomicJson(join(this.root, 'settings.json'), value); return value; });
  }
  allowed(epoch: string): boolean {
    try { const value = this.read(); return value.enabled && !value.demoLocked && value.epoch === epoch; } catch { return false; }
  }
  active(): string | null {
    const path = join(this.root, 'current');
    if (!existsSync(path)) return null;
    if (!lstatSync(path).isSymbolicLink()) throw new Error('invalid_release_pointer');
    const link = readlinkSync(path);
    if (!/^releases\/[a-f0-9-]{36}$/.test(link)) throw new Error('invalid_release_pointer');
    return link.split('/')[1]!;
  }
  switchTo(id: string) {
    if (!/^[a-f0-9-]{36}$/.test(id) || !existsSync(join(this.root, 'releases', id, 'dist', 'index.html'))) throw new Error('invalid_release');
    const temporary = join(this.root, `current-${randomUUID()}`);
    symlinkSync(`releases/${id}`, temporary); renameSync(temporary, join(this.root, 'current'));
  }
  async promote(epoch: string, base: string, candidate: string, smoke: () => Promise<boolean>): Promise<'promoted' | 'cancelled' | 'rolled-back'> {
    return this.locked(async () => {
      if (!this.allowed(epoch) || this.active() !== base) return 'cancelled';
      this.switchTo(candidate);
      try { if (await smoke()) return 'promoted'; } catch { /* Roll back only our attempted activation. */ }
      this.switchTo(base); return 'rolled-back';
    });
  }
}
