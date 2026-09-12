import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/index.js";
import { useApp } from "../state/AppContext.js";
import { api } from "../lib/api.js";
import { apiErrorText } from "../lib/errors.js";
import { fmtInt } from "../lib/format.js";
import { publishDemoTour } from "../lib/demoTour.js";
import { Btn, Credits, Modal } from "./ui.js";
import type { MissionWithProject } from "../../shared/types.js";

export function PledgeDialog({
  mission,
  open,
  onClose,
  onPledged,
  guidedDemo = false,
  initialAmount,
}: {
  mission: MissionWithProject;
  open: boolean;
  onClose: () => void;
  onPledged: (executionStarting: boolean) => void;
  guidedDemo?: boolean;
  initialAmount?: number;
}) {
  const { t, locale } = useI18n();
  const { wallet, setWallet, pushToast, celebratePledge } = useApp();
  const gap = Math.max(0, mission.computeGoal - mission.computePledged);
  const [amount, setAmount] = useState<string>(String(Math.min(gap || 100, wallet)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maximum = Math.min(wallet, gap || wallet);
  const wasOpen = useRef(false);
  /**
   * One key per intent, not per attempt. It is minted when the dialog opens and
   * held across retries, so a double-submit or a network retry of the same
   * pledge is absorbed server-side. Minting it inside `submit` would give every
   * retry a new key and charge the backer twice — the exact defect DATA-01 found.
   */
  const intentKey = useRef<string>("");

  useEffect(() => {
    if (open && !wasOpen.current) {
      setAmount(String(Math.min(initialAmount ?? maximum, maximum)));
      setError(null);
      setBusy(false);
      intentKey.current = crypto.randomUUID();
    }
    wasOpen.current = open;
  }, [open, maximum, initialAmount]);

  const submit = async () => {
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value <= 0) return void setError(t("msn.pledge.invalid"));
    if (value > wallet) return void setError(t("msn.pledge.insufficient"));
    if (gap > 0 && value > gap) return void setError(t("msn.pledge.exceedsGoal"));
    setBusy(true);
    setError(null);
    try {
      const res = await api.pledge(mission.id, value, intentKey.current);
      setWallet(res.wallet);
      for (const a of res.achievements) pushToast({ kind: "achievement", achievement: a });
      pushToast({
        kind: "info",
        message: res.executionStarting ? t("msn.pledge.execStarting") : t("msn.pledge.success"),
      });
      celebratePledge({
        projectName: mission.project.name,
        amount: value,
        executionStarting: res.executionStarting,
      });
      onPledged(res.executionStarting);
      onClose();
    } catch (e) {
      setError(apiErrorText(e, t));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!open || !guidedDemo || busy) return;
    publishDemoTour({
      role: "provider",
      step: 2,
      total: 4,
      title: t("demo.guide.confirm"),
      detail: t("demo.guide.confirm.body"),
      state: "waiting",
      anchorSelector: '[data-demo-action="confirm-pledge"]',
    });
  }, [busy, guidedDemo, open, t]);

  return (
    <Modal open={open} onClose={onClose} title={t("msn.pledge.title")}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="text-sm leading-relaxed text-mut">{t("msn.pledge.desc")}</p>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-bg2 px-3 py-2 text-sm">
        <span className="text-dim">{t("msn.pledge.wallet")}</span>
        <Credits n={wallet} className="font-semibold" />
      </div>

      {gap > 0 && (
        <p className="mt-2 text-xs text-dim">
          <span className="font-mono font-semibold text-fund">{fmtInt(gap, locale)}</span>{" "}
          {t("msn.pledge.remaining")}
        </p>
      )}

      <div className="mt-4">
        <label htmlFor="pledge-amount" className="mb-1.5 block text-xs font-semibold text-mut">{t("msn.pledge.amount")}</label>
        <div className="flex gap-2">
          <input
            id="pledge-amount"
            type="number"
            min={1}
            max={maximum}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-line2 bg-bg0 px-3 py-2 font-mono text-sm outline-none focus:border-fund"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "pledge-error" : undefined}
            data-autofocus
          />
          <Btn kind="ghost" onClick={() => setAmount(String(maximum))}>
            {t("msn.pledge.max")}
          </Btn>
        </div>
        {error && <p id="pledge-error" role="alert" className="mt-2 text-xs text-danger">{error}</p>}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Btn kind="ghost" onClick={onClose}>
          {t("common.cancel")}
        </Btn>
        <Btn data-demo-action="confirm-pledge" type="submit" disabled={busy}>
          ⚡ {t("msn.pledge.confirm")}
        </Btn>
      </div>
      </form>
    </Modal>
  );
}
