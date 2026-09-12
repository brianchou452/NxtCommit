import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Award, Globe, LayoutGrid, PlayCircle, Plus, RotateCcw, Wallet } from "lucide-react";
import { useI18n, type TKey } from "./i18n/index.js";
import { useApp } from "./state/AppContext.js";
import { api } from "./lib/api.js";
import { Avatar, Credits, Logo, ModeBadge } from "./components/ui.js";
import { PledgeCelebration } from "./components/PledgeCelebration.js";
import { TokenRain } from "./components/TokenRain.js";
import { DemoGuide } from "./components/DemoGuide.js";

function Header() {
  const { t, locale, setLocale } = useI18n();
  const { boot, wallet } = useApp();

  const navBase =
    "inline-flex min-h-11 min-w-0 items-center justify-center rounded-full py-1.5 text-sm font-semibold transition-colors lg:min-h-14 lg:text-[15px] xl:min-h-16 xl:text-[16px]";
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `${navBase} whitespace-nowrap px-2 xl:px-3 ${
      isActive ? "bg-ink text-bg1" : "text-mut hover:text-fund"
    }`;
  const mobileNavCls = ({ isActive }: { isActive: boolean }) =>
    `${navBase} px-1 min-[360px]:px-2 ${
      isActive ? "bg-ink text-bg1" : "text-mut hover:text-fund"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg0/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-2 px-2 min-[360px]:px-3 sm:gap-4 sm:px-4 lg:h-[88px] xl:h-[102px] xl:max-w-[1792px] xl:px-6">
        <Link to="/" className="flex min-h-11 min-w-0 shrink-0 items-center gap-2 min-[360px]:gap-2.5">
          <span className="shrink-0"><Logo size={32} /></span>
          <span className="truncate text-[18px] font-bold tracking-[-.035em] xl:text-[24px]">
            NxtCommit
          </span>
        </Link>

        <nav aria-label={t("nav.primary")} className="ml-4 hidden items-center gap-1 lg:ml-4 lg:gap-1 xl:flex">
          <NavLink to="/" end className={navCls}>
            {t("nav.marketplace")}
          </NavLink>
          <NavLink to="/new" className={navCls}>
            <span className="inline-flex items-center gap-1">
              <Plus size={14} /> {t("nav.newMission")}
            </span>
          </NavLink>
          <NavLink to={`/contributors/${boot?.currentUser.id ?? "c_you"}`} className={navCls}>
            <span className="inline-flex items-center gap-1">
              <Award size={14} /> {t("nav.profile")}
            </span>
          </NavLink>
          <NavLink to="/assurance" className={navCls}>Agent Lab</NavLink>
          <NavLink to="/github" className={navCls}>GitHub</NavLink>
          <NavLink to="/demo" className={navCls}>
            <span className="inline-flex items-center gap-1"><PlayCircle size={14} /> Demo</span>
          </NavLink>
        </nav>

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1 min-[360px]:gap-2 sm:gap-3">
          {boot && (
            <span className="hidden shrink-0 sm:inline-flex">
              <ModeBadge mode={boot.execution.resolved} />
            </span>
          )}

          <button
            onClick={() => setLocale(locale === "en" ? "zh-TW" : "en")}
            className="inline-flex min-h-10 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-line2 bg-bg1 px-3 py-1.5 font-mono text-[11px] font-bold text-mut transition-colors hover:border-fund hover:text-fund lg:min-h-12 lg:px-4 lg:text-[13px] xl:min-h-14 xl:px-5 xl:text-[14px]"
            title={t("common.language")}
            aria-label={`${t("common.language")}: ${locale === "en" ? "中文" : "English"}`}
          >
            <Globe size={13} />
            <span className="hidden min-[360px]:inline">{locale === "en" ? "中文" : "EN"}</span>
          </button>

          <span
            className="hidden items-center gap-1.5 rounded-full border border-line2 bg-bg1 px-3 py-2 text-xs sm:inline-flex lg:min-h-12 lg:px-4 lg:text-[14px] xl:min-h-14 xl:px-5 xl:text-[16px]"
            title={t("nav.wallet")}
          >
            <Wallet size={13} className="text-dim" />
            <Credits n={wallet} className="font-semibold" />
          </span>

          {boot && (
            <Link
              to={`/contributors/${boot.currentUser.id}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-[0_7px_20px_rgba(89,72,232,.24)] ring-2 ring-[#6657ff]/15 lg:h-12 lg:w-12 xl:h-16 xl:w-16"
              aria-label={t("nav.profile")}
            >
              <Avatar
                name={boot.currentUser.name}
                color="linear-gradient(135deg, #6f5cff 0%, #4f72e8 52%, #18b9aa 100%)"
                size={42}
              />
            </Link>
          )}
        </div>
      </div>
      <nav
        aria-label={t("nav.primary")}
        className="mx-auto grid max-w-7xl grid-cols-3 border-t border-line px-1 py-1 min-[360px]:px-2 xl:hidden"
      >
        <NavLink to="/" end className={mobileNavCls}>
          <span className="flex min-w-0 max-w-full items-center justify-center gap-1 min-[360px]:gap-1.5">
            <LayoutGrid size={14} className="shrink-0" />
            <span className="truncate">{t("nav.marketplace")}</span>
          </span>
        </NavLink>
        <NavLink to="/new" className={mobileNavCls}>
          <span className="flex min-w-0 max-w-full items-center justify-center gap-1 min-[360px]:gap-1.5">
            <Plus size={14} className="shrink-0" />
            <span className="truncate">{t("nav.newMission")}</span>
          </span>
        </NavLink>
        <NavLink to={`/contributors/${boot?.currentUser.id ?? "c_you"}`} className={mobileNavCls}>
          <span className="flex min-w-0 max-w-full items-center justify-center gap-1 min-[360px]:gap-1.5">
            <Award size={14} className="shrink-0" />
            <span className="truncate">{t("nav.profile")}</span>
          </span>
        </NavLink>
        <NavLink to="/demo" className={mobileNavCls}>
          <span className="flex min-w-0 max-w-full items-center justify-center gap-1"><PlayCircle size={14} className="shrink-0" /><span className="truncate">Demo</span></span>
        </NavLink>
        <NavLink to="/assurance" className={mobileNavCls}>Agent Lab</NavLink>
        <NavLink to="/github" className={mobileNavCls}>GitHub</NavLink>
      </nav>
    </header>
  );
}

function ModeStrip() {
  const { t, lt } = useI18n();
  const { boot } = useApp();
  if (!boot) return null;
  const e = boot.execution;
  // A cached frontend or a mixed-version deployment can briefly reach an API
  // whose bootstrap payload predates the measured isolation field. Treat
  // missing evidence as no isolation instead of crashing or assuming safety.
  const isolation = e.isolation ?? {
    osIsolated: false,
    detail: "Isolation status was not reported by this server; treating it as unavailable.",
  };
  // `resolved` is null when the server refuses the mode it was configured for.
  // Interpolating null would have rendered the literal key `mode.null.desc`.
  const descKey = `mode.${e.resolved ?? "refused"}.desc` as TKey;
  return (
    <div className={e.resolved ? "border-b border-line bg-bg1" : "border-b border-danger/30 bg-danger/10"}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 text-[11px] text-dim lg:py-2 lg:text-[13px] xl:max-w-[1792px] xl:px-6">
        <span className={e.resolved ? undefined : "font-semibold text-danger"}>
          {t(descKey, { host: e.gatewayHost ?? "gateway" })}
          {e.model ? ` · ${e.model}` : ""}
        </span>
        {/*
          The server's own words for the refusal, not a paraphrase: it names which
          mode was asked for and what the isolation probe actually found, and that
          is the only text that tells an operator what to change.
        */}
        {e.error && <span className="text-danger">{e.error}</span>}
        {e.llmValidated && <span className="text-verif">✓ {t("mode.banner.llmOk")}</span>}
        {e.langfuseEnabled && <span className="text-adopt">◈ {t("mode.banner.langfuse")}</span>}
        {/*
          Shown in BOTH states on purpose. An indicator that appears only when
          isolation is present teaches the reader that its absence means nothing
          in particular, when absence is the state that actually carries risk.
          The wording is the measured status, never the configured intent.
        */}
        <span
          className={isolation.osIsolated ? "text-verif" : "text-warn"}
          title={isolation.detail}
        >
          {isolation.osIsolated ? "⛨ " : "⚠ "}
          {t(isolation.osIsolated ? "mode.banner.isolated" : "mode.banner.notIsolated")}
        </span>
        <span className="ml-auto hidden text-dim md:inline">{lt(t("app.tagline"))}</span>
      </div>
    </div>
  );
}

function BootstrapErrorStrip() {
  const { t } = useI18n();
  const { bootStatus, refreshBoot } = useApp();
  if (bootStatus !== "error") return null;
  return (
    <div role="alert" className="border-b border-danger/30 bg-danger/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-xs text-danger">
        <span>{t("shell.bootError")}</span>
        <button onClick={refreshBoot} className="min-h-11 cursor-pointer rounded-lg px-3 font-semibold underline">
          {t("common.retry")}
        </button>
      </div>
    </div>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useApp();
  const { t, lt } = useI18n();
  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          onClick={() => dismissToast(toast.id)}
          className="cc-toast-in pointer-events-auto cursor-pointer rounded-xl border border-line2 bg-bg2 px-4 py-3 text-left shadow-2xl"
        >
          {toast.kind === "achievement" && toast.achievement ? (
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-fund/15 text-fund">
                🏆
              </span>
              <span>
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-fund">
                  {t("ach.unlocked")}
                </span>
                <span className="block text-sm font-bold">{lt(toast.achievement.def.name)}</span>
              </span>
            </span>
          ) : (
            <span className={`text-sm ${toast.kind === "error" ? "text-danger" : "text-ink"}`}>
              {toast.message}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function Footer() {
  const { t } = useI18n();
  const { pushToast, boot } = useApp();
  const [resetting, setResetting] = useState(false);
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-6 text-xs text-dim">
        <Logo size={16} />
        <span>NxtCommit · {t("shell.buildNote")}</span>
        <span className="hidden sm:inline">·</span>
        <span className="hidden sm:inline">{t("shell.disclaimer")}</span>
        <button
          onClick={async () => {
            setResetting(true);
            try {
              await api.demoReset();
              pushToast({ kind: "info", message: t("shell.demoResetDone") });
              setTimeout(() => window.location.assign("/"), 600);
            } catch {
              pushToast({ kind: "error", message: t("common.requestFailed") });
            } finally {
              setResetting(false);
            }
          }}
          disabled={resetting || !!(boot as typeof boot & {demoProtected?: boolean})?.demoProtected}
          className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line2 px-2.5 py-1.5 font-medium text-mut transition-colors hover:text-ink disabled:opacity-40"
        >
          <RotateCcw size={12} className={resetting ? "animate-spin" : ""} />
          {t("shell.demoReset")}
        </button>
      </div>
    </footer>
  );
}

export default function App() {
  const location = useLocation();
  const { t } = useI18n();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("main-content")?.focus();
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[60] -translate-y-20 rounded-lg bg-fund px-4 py-2 font-semibold text-bg0 transition-transform focus:translate-y-0"
      >
        {t("nav.skip")}
      </a>
      <Header />
      <BootstrapErrorStrip />
      <ModeStrip />
      <div
        role={["/assurance","/github"].includes(location.pathname) ? undefined : "main"}
        id={["/assurance","/github"].includes(location.pathname) ? undefined : "main-content"}
        tabIndex={-1}
        className={`mx-auto w-full flex-1 pt-4 focus:outline-none ${location.pathname === "/" ? "max-w-none px-4 lg:px-8 xl:px-[42px] xl:pt-6" : "max-w-7xl px-4"}`}
      >
        <Outlet />
      </div>
      <Footer />
      <TokenRain />
      <Toasts />
      <PledgeCelebration />
      <DemoGuide />
    </div>
  );
}
