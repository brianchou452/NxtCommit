import { acquireLease } from '../agents/lease.js';
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  rmSync,
  existsSync,
  symlinkSync,
  readlinkSync,
  lstatSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export const defaultGoal =
  'Improve productRequest failure handling for null and non-JSON HTTP error responses. Preserve successful response payloads, structured server codes and AbortError identity. If already satisfied, return no edits.';
export interface UpdateSettings {
  enabled: boolean;
  demoLocked: boolean;
  epoch: string;
  goal: string;
}
export const defaults = (): UpdateSettings => ({
  enabled: false,
  demoLocked: true,
  epoch: randomUUID(),
  goal: defaultGoal,
});
export function atomicJson(path: string, value: unknown) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' });
  renameSync(temporary, path);
}
export class UpdateControl {
  readonly root: string;
  constructor(root: string) {
    this.root = resolve(root);
    mkdirSync(this.root, { recursive: true, mode: 0o700 });
  }
  async locked<T>(work: () => T | Promise<T>): Promise<T> {
    // An old worker uses a different locking protocol; never overlap an upgrade.
    if (existsSync(join(this.root, 'control.lock'))) throw Error('legacy_control_lock');
    const release = await acquireLease(join(this.root, 'control-lock.sqlite'), 10000);
    try {
      this.recoverActivation();
      return await work();
    } finally {
      release();
    }
  }
  private recoverActivation() {
    const path = join(this.root, 'activation.json');
    if (!existsSync(path)) return;
    const pending = JSON.parse(readFileSync(path, 'utf8')) as {
      base: string;
      candidate: string;
      epoch: string;
    };
    if (
      ![pending.base, pending.candidate].every((id) => /^[a-f0-9-]{36}$/.test(id)) ||
      typeof pending.epoch !== 'string'
    )
      throw Error('invalid_activation_journal');
    const receipt = join(this.root, 'promotions', pending.candidate + '.json');
    if (existsSync(receipt)) {
      const done = JSON.parse(readFileSync(receipt, 'utf8')) as {
        base: string;
        epoch: string;
        status: string;
      };
      if (
        done.base !== pending.base ||
        done.epoch !== pending.epoch ||
        !['promoted', 'rolled-back'].includes(done.status)
      )
        throw Error('invalid_activation_receipt');
    } else {
      const active = this.active();
      if (active !== pending.base && active !== pending.candidate)
        throw Error('activation_recovery_conflict');
      if (active === pending.candidate) this.switchTo(pending.base);
      mkdirSync(join(this.root, 'promotions'), { recursive: true, mode: 0o700 });
      atomicJson(receipt, { ...pending, status: 'rolled-back', reason: 'interrupted_activation' });
    }
    rmSync(path);
  }

  read(): UpdateSettings {
    const path = join(this.root, 'settings.json');
    if (!existsSync(path))
      return { enabled: false, demoLocked: true, epoch: 'uninitialized', goal: defaultGoal };
    const value = JSON.parse(readFileSync(path, 'utf8')) as UpdateSettings;
    if (
      typeof value.enabled !== 'boolean' ||
      typeof value.demoLocked !== 'boolean' ||
      typeof value.epoch !== 'string' ||
      typeof value.goal !== 'string' ||
      !value.goal.trim() ||
      value.goal.length > 2000
    )
      throw new Error('invalid_settings');
    return value;
  }
  async change(
    change: Partial<Pick<UpdateSettings, 'enabled' | 'demoLocked' | 'goal'>>,
  ): Promise<UpdateSettings> {
    return this.locked(() => {
      const value = { ...this.read(), ...change, epoch: randomUUID() };
      atomicJson(join(this.root, 'settings.json'), value);
      return value;
    });
  }
  allowed(epoch: string): boolean {
    try {
      const value = this.read();
      return value.enabled && !value.demoLocked && value.epoch === epoch;
    } catch {
      return false;
    }
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
    if (!/^[a-f0-9-]{36}$/.test(id) || !existsSync(join(this.root, 'releases', id, 'dist', 'index.html')))
      throw new Error('invalid_release');
    const temporary = join(this.root, `current-${randomUUID()}`);
    symlinkSync(`releases/${id}`, temporary);
    renameSync(temporary, join(this.root, 'current'));
  }
  async promote(
    epoch: string,
    base: string,
    candidate: string,
    smoke: () => Promise<boolean>,
  ): Promise<'promoted' | 'cancelled' | 'rolled-back'> {
    return this.locked(async () => {
      const receipt = join(this.root, 'promotions', candidate + '.json');
      if (existsSync(receipt)) {
        const previous = JSON.parse(readFileSync(receipt, 'utf8')) as {
          base: string;
          epoch: string;
          status: string;
        };
        if (previous.base !== base || previous.epoch !== epoch) return 'cancelled';
        if (previous.status === 'rolled-back') return 'rolled-back';
        return previous.status === 'promoted' && this.active() === candidate ? 'promoted' : 'cancelled';
      }
      if (!this.allowed(epoch) || this.active() !== base) return 'cancelled';
      mkdirSync(join(this.root, 'promotions'), { recursive: true, mode: 0o700 });
      const journal = join(this.root, 'activation.json');
      atomicJson(journal, { base, candidate, epoch });
      this.switchTo(candidate);
      let status: 'promoted' | 'rolled-back' = 'rolled-back';
      try {
        if (await smoke()) status = 'promoted';
      } catch {
        /* Restore the unverified release. */
      }
      if (status === 'rolled-back') this.switchTo(base);
      atomicJson(receipt, { base, candidate, epoch, status });
      rmSync(journal);
      return status;
    });
  }
}
