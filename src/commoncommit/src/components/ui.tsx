import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import {
  BadgeCheck,
  BookOpen,
  Bot,
  Bug,
  Cpu,
  FlaskConical,
  Gem,
  LifeBuoy,
  Moon,
  Network,
  PackageCheck,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sunrise,
  X,
  Zap,
} from "lucide-react";
import { useI18n, type TKey } from "../i18n/index.js";
import { fmtCompact, fmtInt, fmtPct } from "../lib/format.js";
import type {
  AchievementCode,
  EventSource,
  Mission,
  MissionStatus,
  RiskLevel,
  RunnerMode,
} from "../../shared/types.js";

// ── logo ─────────────────────────────────────────────────────────────────────

export function Logo({ size = 22 }: { size?: number }) {
  const gradientId = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="4" y1="26" x2="28" y2="5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6437ff" />
          <stop offset=".52" stopColor="#397cf4" />
          <stop offset="1" stopColor="#20c8bd" />
        </linearGradient>
      </defs>
      <path d="M5.5 24.5 12.2 15.5 19.4 20 26.5 7" fill="none" stroke={`url(#${gradientId})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="5.5" cy="24.5" r="3.45" fill="white" stroke={`url(#${gradientId})`} strokeWidth="3.5" />
      <circle cx="12.2" cy="15.5" r="3.45" fill="white" stroke={`url(#${gradientId})`} strokeWidth="3.5" />
      <circle cx="19.4" cy="20" r="3.45" fill="white" stroke={`url(#${gradientId})`} strokeWidth="3.5" />
      <circle cx="26.5" cy="7" r="3.45" fill="white" stroke={`url(#${gradientId})`} strokeWidth="3.5" />
    </svg>
  );
}

// ── buttons ──────────────────────────────────────────────────────────────────

export function Btn({
  children,
  kind = "primary",
  className = "",
  type = "button",
  ...buttonProps
}: Omit<ComponentProps<"button">, "children"> & {
  children: ReactNode;
  kind?: "primary" | "ghost" | "danger" | "success";
}) {
  const styles = {
    primary: "bg-ink text-bg1 hover:bg-fund font-semibold shadow-sm",
    ghost: "bg-bg1 border border-line2 text-ink hover:border-fund hover:text-fund",
    danger: "bg-transparent border border-danger/50 text-danger hover:bg-danger/10",
    success: "bg-ok text-bg1 hover:brightness-95 font-semibold",
  }[kind];
  return (
    <button
      type={type}
      {...buttonProps}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

// ── status / trust ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<MissionStatus, string> = {
  funding: "text-fund border-fund/40 bg-fund/10",
  funded: "text-ok border-ok/40 bg-ok/10",
  executing: "text-dev border-dev/40 bg-dev/10",
  needs_review: "text-verif border-verif/40 bg-verif/10",
  changes_requested: "text-warn border-warn/40 bg-warn/10",
  approved: "text-verif border-verif/40 bg-verif/10",
  released: "text-adopt border-adopt/40 bg-adopt/10",
  failed: "text-danger border-danger/40 bg-danger/10",
  stalled: "text-warn border-warn/40 bg-warn/10",
};

export function StatusPill({ status, pulse }: { status: MissionStatus; pulse?: boolean }) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[14px] font-semibold uppercase tracking-wide ${STATUS_COLORS[status]}`}
    >
      {(status === "executing" || pulse) && <span className="cc-pulse inline-block h-1.5 w-1.5 rounded-full bg-current" />}
      {t(`status.${status}` as TKey)}
    </span>
  );
}

/** Execution-mode label: which runner actually does/did the work. Never conflated. */
/**
 * `mode` is nullable because a server asked for a real agent without a measured
 * per-run OS boundary resolves to NO mode — it refuses. That state renders as its
 * own danger-coloured badge, because the two wrong alternatives both mislead:
 * hiding the badge reads as "nothing to report", and showing "demo" claims a
 * working deployment that will in fact execute nothing.
 */
export function ModeBadge({ mode, detailed }: { mode: RunnerMode | null; detailed?: boolean }) {
  const { t } = useI18n();
  const cfg = {
    codex: { icon: <Bot size={12} />, cls: "text-verif border-verif/40 bg-verif/10" },
    llm: { icon: <Cpu size={12} />, cls: "text-dev border-dev/40 bg-dev/10" },
    demo: { icon: <FlaskConical size={12} />, cls: "text-warn border-warn/40 bg-warn/10" },
  };
  const key = mode ?? "refused";
  const style = mode ? cfg[mode] : { icon: <ShieldAlert size={12} />, cls: "text-danger border-danger/40 bg-danger/10" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[14px] font-semibold ${style.cls}`} title={t(`mode.${key}.desc` as TKey)}>
      {style.icon}
      {t(`mode.${key}` as TKey)}
      {detailed && mode === "demo" && <span className="font-normal opacity-80">· {t("trust.scripted")}</span>}
    </span>
  );
}

/** Per-event trust label: who said this — engine-verified fact vs agent output vs demo script. */
export function SourceBadge({ source, verified }: { source: EventSource; verified: boolean }) {
  const { t } = useI18n();
  if (source === "engine") {
    return (
      <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[14px] font-semibold ${
        verified ? "border-verif/30 bg-verif/10 text-verif" : "border-line2 bg-bg2 text-mut"
      }`}>
        <BadgeCheck size={10} /> {verified ? t("trust.verified") : t("trust.engineObservation")}
      </span>
    );
  }
  const map: Partial<Record<EventSource, { label: string; cls: string }>> = {
    codex: { label: "Codex", cls: "border-verif/30 text-verif bg-verif/5" },
    llm: { label: t("trust.agentClaim"), cls: "border-dev/30 text-dev bg-dev/5" },
    demo: { label: t("trust.scripted"), cls: "border-warn/30 text-warn bg-warn/5" },
    maintainer: { label: t("trust.maintainer"), cls: "border-adopt/30 text-adopt bg-adopt/5" },
    system: { label: t("trust.system"), cls: "border-line2 text-mut bg-bg2" },
  };
  const cfg = map[source];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[14px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export function DataModeBadge({ mode }: { mode: "live" | "demo" }) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[14px] font-semibold ${
        mode === "live" ? "border-verif/30 text-verif bg-verif/5" : "border-warn/30 text-warn bg-warn/5"
      }`}
    >
      {mode === "live" ? t("trust.liveData") : t("trust.demoData")}
    </span>
  );
}

export function GeneratorBadge({ generator }: { generator: "openai" | "demo" }) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[14px] font-semibold ${
        generator === "openai" ? "border-dev/30 text-dev bg-dev/5" : "border-warn/30 text-warn bg-warn/5"
      }`}
    >
      <Sparkles size={10} />
      {generator === "openai" ? t("msn.generator.openai") : t("msn.generator.demo")}
    </span>
  );
}

// ── the four dimensions ──────────────────────────────────────────────────────

const DIMS = [
  { key: "funding", color: "var(--color-fund)" },
  { key: "development", color: "var(--color-dev)" },
  { key: "verification", color: "var(--color-verif)" },
  { key: "adoption", color: "var(--color-adopt)" },
] as const;

/** Compact 4-bar strip for cards. */
export function FourDimsStrip({ progress }: { progress: Mission["progress"] }) {
  const { t } = useI18n();
  return (
    <div className="flex gap-1.5">
      {DIMS.map((d) => (
        <div key={d.key} className="flex-1" title={`${t(`dim.${d.key}` as TKey)} ${fmtPct(progress[d.key])}`}>
          <div className="h-1 overflow-hidden rounded-full bg-bg3">
            <div
              className="cc-progress-bar h-full rounded-full"
              style={{ width: fmtPct(progress[d.key]), background: d.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Full labelled version for detail pages. Always 2×2 so it stays readable
 * inside a narrow sidebar; pass wide for a single row on roomy layouts.
 */
export function FourDims({ progress, wide }: { progress: Mission["progress"]; wide?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={`grid gap-x-5 gap-y-3.5 ${wide ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
      {DIMS.map((d) => (
        <div key={d.key} className="min-w-0">
          <div className="mb-1.5 flex items-baseline justify-between gap-1">
            <span className="truncate text-[14px] font-medium text-mut">{t(`dim.${d.key}` as TKey)}</span>
            <span className="shrink-0 font-mono text-xs font-semibold" style={{ color: d.color }}>
              {fmtPct(progress[d.key])}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-bg3">
            <div
              className="cc-progress-bar h-full rounded-full"
              style={{ width: fmtPct(progress[d.key]), background: d.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── misc primitives ──────────────────────────────────────────────────────────

export function Credits({ n, compact, className = "" }: { n: number; compact?: boolean; className?: string }) {
  const { locale } = useI18n();
  return (
    <span className={`inline-flex items-center gap-1 font-mono ${className}`}>
      <Zap size={12} className="text-fund" fill="currentColor" />
      {compact ? fmtCompact(n, locale) : fmtInt(n, locale)}
    </span>
  );
}

export function Avatar({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-bg0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const { t } = useI18n();
  const cls = {
    low: "text-verif border-verif/30 bg-verif/5",
    medium: "text-warn border-warn/30 bg-warn/5",
    high: "text-danger border-danger/30 bg-danger/5",
  }[level];
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded border px-2 py-0.5 text-[14px] font-semibold ${cls}`}>
      {t(`msn.risk.${level}` as TKey)}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[22px] border border-line bg-bg1 shadow-[0_18px_55px_rgba(24,20,45,.045)] ${className}`}>{children}</div>;
}

export function SectionHeading({
  title,
  blurb,
  accent,
}: {
  title: string;
  blurb?: string;
  accent?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className="min-w-0 max-w-full text-balance break-words text-2xl font-semibold tracking-[-.035em]" style={accent ? { color: accent } : undefined}>
        {title}
      </h2>
      {blurb && <p className="hidden min-w-0 flex-1 text-sm leading-relaxed text-dim sm:block">{blurb}</p>}
    </div>
  );
}

export function Sparkline({ points, color = "var(--color-adopt)", width = 120, height = 32 }: { points: number[]; color?: string; width?: number; height?: number }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - 3 - ((p - min) / span) * (height - 6)).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle
        cx={width}
        cy={height - 3 - ((points[points.length - 1] - min) / span) * (height - 6)}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

export function HealthRing({ score, size = 40 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 70 ? "var(--color-verif)" : score >= 45 ? "var(--color-warn)" : "var(--color-danger)";
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-bg3)" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <span className="absolute font-mono text-[14px] font-bold" style={{ color }}>
        {score}
      </span>
    </span>
  );
}

export function EmptyState({ icon, title, sub }: { icon: ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line2 px-6 py-12 text-center">
      <div className="text-dim">{icon}</div>
      <p className="font-semibold text-mut">{title}</p>
      {sub && <p className="max-w-sm text-sm text-dim">{sub}</p>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`cc-skeleton rounded-lg ${className}`} />;
}

export function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title: string }) {
  const { t } = useI18n();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter((element) => !element.hidden);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    queueMicrotask(() => {
      const preferred = dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]");
      (preferred ?? closeRef.current)?.focus();
    });
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg0/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={dialogRef}
        className="cc-toast-in max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[28px] border border-line2 bg-bg1 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id={titleId} className="text-base font-bold">{title}</h3>
          <button ref={closeRef} onClick={onClose} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded text-dim hover:bg-bg3 hover:text-ink" aria-label={t("common.close")}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── achievements ─────────────────────────────────────────────────────────────

export const ACHIEVEMENT_ICONS: Record<AchievementCode, ReactNode> = {
  first_spark: <Sparkles size={18} />,
  early_backer: <Sunrise size={18} />,
  final_push: <Rocket size={18} />,
  ship_it: <PackageCheck size={18} />,
  project_rescuer: <LifeBuoy size={18} />,
  security_guardian: <ShieldCheck size={18} />,
  hidden_gem: <Gem size={18} />,
  dependency_defender: <Network size={18} />,
  first_bug_hero: <Bug size={18} />,
  documentation_angel: <BookOpen size={18} />,
  ai_architect: <Cpu size={18} />,
  oss_guardian: <ShieldCheck size={18} />,
  night_owl_sponsor: <Moon size={18} />,
};

const TIER_STYLES = {
  bronze: "border-[#b3763f]/50 bg-[#b3763f]/10 text-[#e0a878]",
  silver: "border-[#9fb2c8]/50 bg-[#9fb2c8]/10 text-[#c8d6e5]",
  gold: "border-fund/60 bg-fund/10 text-fund",
};

/** Category accent is separate from rank: tier owns the border, code owns the icon cue. */
export const ACHIEVEMENT_ACCENTS: Record<AchievementCode, string> = {
  first_spark: "bg-fund/15 text-fund ring-fund/30",
  early_backer: "bg-fund/15 text-fund ring-fund/30",
  final_push: "bg-fund/15 text-fund ring-fund/30",
  ship_it: "bg-verif/15 text-verif ring-verif/30",
  project_rescuer: "bg-verif/15 text-verif ring-verif/30",
  security_guardian: "bg-dev/15 text-dev ring-dev/30",
  hidden_gem: "bg-adopt/15 text-adopt ring-adopt/30",
  dependency_defender: "bg-dev/15 text-dev ring-dev/30",
  first_bug_hero: "bg-danger/15 text-danger ring-danger/30",
  documentation_angel: "bg-brand/15 text-brand-text ring-brand2/30",
  ai_architect: "bg-adopt/15 text-adopt ring-adopt/30",
  oss_guardian: "bg-dev/15 text-dev ring-dev/30",
  night_owl_sponsor: "bg-brand/15 text-brand-text ring-brand2/30",
};

export const ACHIEVEMENT_CARD_ACCENTS: Record<AchievementCode, string> = {
  first_spark: "border-l-fund/70",
  early_backer: "border-l-fund/70",
  final_push: "border-l-fund/70",
  ship_it: "border-l-verif/70",
  project_rescuer: "border-l-verif/70",
  security_guardian: "border-l-dev/70",
  hidden_gem: "border-l-adopt/70",
  dependency_defender: "border-l-dev/70",
  first_bug_hero: "border-l-danger/70",
  documentation_angel: "border-l-brand2/70",
  ai_architect: "border-l-adopt/70",
  oss_guardian: "border-l-dev/70",
  night_owl_sponsor: "border-l-brand2/70",
};

export function AchievementBadge({
  code,
  tier,
  size = "md",
}: {
  code: AchievementCode;
  tier: "bronze" | "silver" | "gold";
  size?: "sm" | "md";
}) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${TIER_STYLES[tier]} ${
        size === "sm" ? "px-2 py-0.5 text-[14px]" : "px-3 py-1 text-xs"
      }`}
      title={t(`ach.${code}.desc` as TKey)}
    >
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ${ACHIEVEMENT_ACCENTS[code]}`} aria-hidden>
        {ACHIEVEMENT_ICONS[code]}
      </span>
      {t(`ach.${code}` as TKey)}
    </span>
  );
}
