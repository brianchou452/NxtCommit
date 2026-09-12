import { useEffect, useRef, useState } from 'react';
import type { MissionDetail } from '../../shared/mission.js';
import { useLocale } from '../i18n/LocaleProvider.js';
import { pledgeMission, type PledgeResult } from '../services/mission.js';

export function PledgeDialog({ mission, wallet, onClose, onSuccess }: { mission: MissionDetail; wallet: number; onClose(): void; onSuccess(result: PledgeResult): void }) {
  const { text } = useLocale();
  const remaining = Math.max(0, mission.computeGoal - mission.computePledged);
  const [amount, setAmount] = useState(String(Math.min(wallet, remaining)));
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const intent = useRef({ key: crypto.randomUUID(), amount });
  const submitting = useRef(false);
  const alive = useRef(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    alive.current = true;
    dialog.current?.showModal(); input.current?.focus();
    return () => { alive.current = false; };
  }, []);
  function updateAmount(value: string) {
    setAmount(value); setError('');
    if (value !== intent.current.amount) intent.current = { key: crypto.randomUUID(), amount: value };
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true; setPending(true); setError('');
    try {
      const result = await pledgeMission(mission.id, Number(amount), intent.current.key);
      if (alive.current && result.mission.id === mission.id) onSuccess(result);
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : text.mission_dispatch_error); }
    finally { submitting.current = false; if (alive.current) setPending(false); }
  }
  return <dialog ref={dialog} className="pledge-dialog" aria-labelledby="pledge-title" data-testid="pledge-dialog" onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}>
    <form onSubmit={event => void submit(event)}>
      <header><h2 id="pledge-title">{text.mission_pledge}</h2><button type="button" aria-label={text.mission_close} disabled={pending} onClick={onClose}>×</button></header>
      <p>{text.mission_units}</p><div className="pledge-wallet"><span>{text.mission_wallet}</span><strong>{wallet.toLocaleString()}</strong></div>
      <p><strong>{remaining.toLocaleString()}</strong> {text.mission_remaining}</p>
      <label htmlFor="pledge-amount">{text.mission_amount}</label><div className="pledge-input"><input ref={input} id="pledge-amount" type="number" required min="1" max={Math.min(wallet, remaining)} step="1" value={amount} disabled={pending} onChange={event => updateAmount(event.target.value)} /><button type="button" disabled={pending} onClick={() => updateAmount(String(Math.min(wallet, remaining)))}>{text.mission_max}</button></div>
      {error && <p role="alert" className="mission-error">{error}</p>}
      <footer><button type="button" disabled={pending} onClick={onClose}>{text.mission_cancel}</button><button data-guide-target="next" data-guide-step="2" data-guide-title="mission_confirm" className="mission-primary" type="submit" disabled={pending}>{pending ? text.mission_submitting : text.mission_confirm}</button></footer>
    </form>
  </dialog>;
}
