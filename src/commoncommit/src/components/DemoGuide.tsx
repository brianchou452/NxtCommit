import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CheckCircle2, FlaskConical, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/index.js";
import {
  clearDemoControl,
  DEMO_TOUR_EVENT,
  demoTourRole,
  highlightDemoControl,
  latestDemoTourUpdate,
  type DemoTourUpdate,
} from "../lib/demoTour.js";

type Placement = "left" | "right" | "top" | "bottom";
interface GuidePosition { top: number; left: number; placement: Placement }

/** Persistent guide for the real, state-changing demo journey. */
export function DemoGuide() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const guideRef = useRef<HTMLElement>(null);
  const role = demoTourRole(location.search);
  const enabled = role !== null;
  const [update, setUpdate] = useState<DemoTourUpdate>({
    role: role ?? "maintainer",
    step: 1,
    total: 6,
    title: t("demo.guide.start"),
    detail: t("demo.guide.start.body"),
    state: "running",
  });
  const [position, setPosition] = useState<GuidePosition | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const onUpdate = (event: Event) => setUpdate((event as CustomEvent<DemoTourUpdate>).detail);
    window.addEventListener(DEMO_TOUR_EVENT, onUpdate);
    const latest = latestDemoTourUpdate();
    if (latest?.role === role) setUpdate(latest);
    return () => window.removeEventListener(DEMO_TOUR_EVENT, onUpdate);
  }, [enabled, role]);

  useEffect(() => {
    if (!enabled || !update.anchorSelector) {
      clearDemoControl();
      setPosition(null);
      return;
    }
    let frame = 0;
    const place = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const anchor = Array.from(document.querySelectorAll<HTMLElement>(update.anchorSelector!)).find(node => node.getClientRects().length > 0);
        if (!anchor) {
          setPosition(null);
          return;
        }
        if (anchor.dataset.demoActive !== "true") highlightDemoControl(update.anchorSelector!);
        const rect = anchor.getBoundingClientRect();
        const guide = guideRef.current?.getBoundingClientRect();
        const width = guide?.width ?? Math.min(368, window.innerWidth - 32);
        const height = guide?.height ?? 178;
        const margin = 16;
        const gap = 16;
        const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
        let placement: Placement;
        let top: number;
        let left: number;
        if (rect.right + gap + width <= window.innerWidth - margin) {
          placement = "right";
          left = rect.right + gap;
          top = clamp(rect.top + rect.height / 2 - 38, margin, window.innerHeight - height - margin);
        } else if (rect.left - gap - width >= margin) {
          placement = "left";
          left = rect.left - gap - width;
          top = clamp(rect.top + rect.height / 2 - 38, margin, window.innerHeight - height - margin);
        } else if (rect.bottom + gap + height <= window.innerHeight - margin) {
          placement = "bottom";
          left = clamp(rect.left, margin, window.innerWidth - width - margin);
          top = rect.bottom + gap;
        } else {
          placement = "top";
          left = clamp(rect.left, margin, window.innerWidth - width - margin);
          top = Math.max(margin, rect.top - gap - height);
        }
        setPosition({ top, left, placement });
      });
    };
    place();
    const observer = new MutationObserver(place);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-demo-active"] });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      clearDemoControl();
    };
  }, [enabled, location.pathname, update.anchorSelector]);

  if (!enabled) return null;
  const pct = Math.max(0, Math.min(100, (update.step / update.total) * 100));

  const guideStyle: CSSProperties = position
    ? { top: position.top, left: position.left }
    : { bottom: 16, left: 16 };

  return (
    <>
    {position && <div className="cc-demo-scrim pointer-events-none fixed inset-0 z-40" aria-hidden />}
    <aside
      ref={guideRef}
      className="cc-demo-guide fixed z-[70] w-[min(23rem,calc(100vw-2rem))] rounded-2xl border border-brand2/45 bg-bg1/95 p-4 shadow-2xl backdrop-blur"
      style={guideStyle}
      data-placement={position?.placement}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${update.state === "done" ? "border-verif/40 bg-verif/10 text-verif" : "border-brand2/35 bg-brand/10 text-brand-text"}`}>
          {update.state === "done" ? <CheckCircle2 size={18} /> : <FlaskConical size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-text">
              {t(update.role === "maintainer" ? "demo.guide.maintainer.label" : "demo.guide.provider.label")} · {update.step}/{update.total}
            </p>
            <button
              type="button"
              onClick={() => {
                clearDemoControl();
                navigate(location.pathname, { replace: true });
              }}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-dim hover:bg-bg3 hover:text-ink"
              aria-label={t("demo.guide.stop")}
            >
              <X size={14} />
            </button>
          </div>
          <p className="mt-1 text-sm font-bold text-ink">{update.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-mut">{update.detail}</p>
          {update.anchorSelector && update.state !== "done" && (
            <p className="mt-2 text-[11px] font-semibold text-fund">{t("demo.guide.clickHint")}</p>
          )}
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg3" aria-hidden>
        <span className="cc-progress-bar block h-full rounded-full bg-brand2" style={{ width: `${pct}%` }} />
      </div>
    </aside>
    </>
  );
}
