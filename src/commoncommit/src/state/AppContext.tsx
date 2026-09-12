import { useStream, globalStreamUrl } from "../lib/stream.js";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type AchievementWithDef } from "../lib/api.js";
import type { BootstrapData } from "../../shared/types.js";

interface Toast {
  id: number;
  kind: "achievement" | "info" | "error";
  achievement?: AchievementWithDef;
  message?: string;
}

export interface PledgeCelebrationState {
  id: number;
  projectName: string;
  amount: number;
  executionStarting: boolean;
}

export type DemoRole = "maintainer" | "backer";
export type DeliveryStage = "issue" | "plan" | "funding" | "branch" | "pr" | "ci" | "review" | "merge" | "release";

export interface SharedCampaignDemoState {
  role: DemoRole;
  stage: DeliveryStage;
  scopeConfirmed: boolean;
  reviewCommitted: boolean;
  funded: boolean;
  backedByViewer: boolean;
}

interface AppState {
  boot: BootstrapData | null;
  bootStatus: "loading" | "ready" | "error";
  wallet: number;
  setWallet: (v: number) => void;
  refreshBoot: () => void;
  toasts: Toast[];
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  pledgeCelebration: PledgeCelebrationState | null;
  celebratePledge: (pledge: Omit<PledgeCelebrationState, "id">) => void;
  dismissPledgeCelebration: (id: number) => void;
  campaignDemo: SharedCampaignDemoState;
  setDemoRole: (role: DemoRole) => void;
  advanceCampaignDemo: () => void;
  resetCampaignDemo: () => void;
}

const Ctx = createContext<AppState | null>(null);
let toastSeq = 1;
let celebrationSeq = 1;
const DELIVERY_STAGES: DeliveryStage[] = ["issue", "plan", "funding", "branch", "pr", "ci", "review", "merge", "release"];
const INITIAL_CAMPAIGN_DEMO: SharedCampaignDemoState = {
  role: "maintainer",
  stage: "issue",
  scopeConfirmed: false,
  reviewCommitted: false,
  funded: false,
  backedByViewer: false,
};

function loadCampaignDemo(): SharedCampaignDemoState {
  try {
    const raw = window.localStorage.getItem("commoncommit:shared-campaign-demo");
    return raw ? { ...INITIAL_CAMPAIGN_DEMO, ...JSON.parse(raw) as Partial<SharedCampaignDemoState> } : INITIAL_CAMPAIGN_DEMO;
  } catch {
    return INITIAL_CAMPAIGN_DEMO;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [boot, setBoot] = useState<BootstrapData | null>(null);
  const [bootStatus, setBootStatus] = useState<AppState["bootStatus"]>("loading");
  const [wallet, setWallet] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pledgeCelebration, setPledgeCelebration] = useState<PledgeCelebrationState | null>(null);
  const [campaignDemo, setCampaignDemo] = useState<SharedCampaignDemoState>(loadCampaignDemo);

  useEffect(() => {
    try { window.localStorage.setItem("commoncommit:shared-campaign-demo", JSON.stringify(campaignDemo)); } catch { /* Optional preference storage. */ }
  }, [campaignDemo]);

  const refreshBoot = useCallback(() => {
    setBootStatus("loading");
    api
      .bootstrap()
      .then((b) => {
        setBoot(b);
        setWallet(b.currentUser.walletBalance);
        setBootStatus("ready");
      })
      .catch(() => setBootStatus("error"));
  }, []);

  useEffect(refreshBoot, [refreshBoot]);
  useStream(globalStreamUrl(), (message) => {
    if (message.kind === "mission_update" && bootStatus === "ready") void api.bootstrap().then(b => {setBoot(b);setWallet(b.currentUser.walletBalance);}).catch(() => {});
  });

  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    const id = toastSeq++;
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const celebratePledge = useCallback((pledge: Omit<PledgeCelebrationState, "id">) => {
    setPledgeCelebration({ ...pledge, id: celebrationSeq++ });
  }, []);

  const dismissPledgeCelebration = useCallback((id: number) => {
    setPledgeCelebration((current) => (current?.id === id ? null : current));
  }, []);

  const setDemoRole = useCallback((role: DemoRole) => {
    setCampaignDemo((current) => ({ ...current, role }));
  }, []);

  const advanceCampaignDemo = useCallback(() => {
    setCampaignDemo((current) => {
      const index = DELIVERY_STAGES.indexOf(current.stage);
      const next = DELIVERY_STAGES[Math.min(DELIVERY_STAGES.length - 1, index + 1)];
      return {
        ...current,
        stage: next,
        scopeConfirmed: current.scopeConfirmed || current.stage === "issue",
        reviewCommitted: current.reviewCommitted || current.stage === "plan",
        funded: current.funded || current.stage === "funding",
        backedByViewer: current.backedByViewer || (current.role === "backer" && current.stage === "funding"),
      };
    });
  }, []);

  const resetCampaignDemo = useCallback(() => setCampaignDemo(INITIAL_CAMPAIGN_DEMO), []);

  return (
    <Ctx.Provider value={{
      boot,
      bootStatus,
      wallet,
      setWallet,
      refreshBoot,
      toasts,
      pushToast,
      dismissToast,
      pledgeCelebration,
      celebratePledge,
      dismissPledgeCelebration,
      campaignDemo,
      setDemoRole,
      advanceCampaignDemo,
      resetCampaignDemo,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp outside AppProvider");
  return ctx;
}
