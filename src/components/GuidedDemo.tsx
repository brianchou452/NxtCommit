import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLocale } from "../i18n/LocaleProvider.js";
import { resetDemo, fetchBootstrap } from "../services/api.js";
export function DemoLauncher() {
  const { text } = useLocale();
  const navigate = useNavigate();
  const [state, setState] = useState<"ready" | "resetting" | "error">("ready");
  const [protectedDemo, setProtectedDemo] = useState(false);
  useEffect(() => { let active = true; void fetchBootstrap().then(value => { if (active) setProtectedDemo(value.demoProtected === true); }).catch(() => {}); return () => { active = false; }; }, []);
  async function launch(role: "provider" | "maintainer") {
    if (state === "resetting") return;
    setState("resetting");
    try {
      const snapshot = await fetchBootstrap();
      if (!snapshot.demoProtected) await resetDemo();
      navigate(`${role === "provider" ? "/marketplace" : "/new"}?demo=${role}`);
    } catch {
      setState("error");
    }
  }
  return (
    <>
      <p className="reset-disclosure">{protectedDemo ? text.demo_protected : text.demo_reset_notice}</p>
      {state === "error" && <p role="alert">{text.reset_error}</p>}
      {state === "resetting" && <p role="status">{text.reset_pending}</p>}
      <div className="demo-choices">
        {(["provider", "maintainer"] as const).map((role) => (
          <section className="panel" key={role}>
            <h2>
              {text[role === "provider" ? "demo_provider" : "demo_maintainer"]}
            </h2>
            <p>{text.demo_explanation}</p>
            <button
              className="button primary"
              disabled={state === "resetting"}
              onClick={() => void launch(role)}
            >
              {
                text[
                  role === "provider" ? "launch_provider" : "launch_maintainer"
                ]
              }
            </button>
          </section>
        ))}
      </div>
    </>
  );
}
export function GuidedDemo() {
  const location = useLocation();
  const navigate = useNavigate();
  const { text } = useLocale();
  const role = new URLSearchParams(location.search).get("demo");
  const [target, setTarget] = useState<"waiting" | "visible" | "missing" | "complete">("waiting");
  const [step, setStep] = useState("1");
  const [instruction, setInstruction] = useState<string>("");
  useEffect(() => {
    if (role !== "provider" && role !== "maintainer") return;
    let highlighted: Element | null = null;
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout>;
    setTarget("waiting");
    const detect = () => {
      if (document.querySelector('[data-guide-complete="true"]')) { setTarget("complete"); highlighted?.classList.remove("guide-target"); return; }
      const selector = location.pathname === "/marketplace" ? '[data-guide-target="campaign"]' : '[data-guide-target="next"], [data-guide-target="analyze"]';
      const next = [...document.querySelectorAll<HTMLElement>(selector)].find(node => node.getClientRects().length > 0 && !node.hasAttribute('disabled'));
      if (next) {
        clearTimeout(timer);
        if (highlighted !== next) { highlighted?.classList.remove("guide-target"); highlighted = next; next.classList.add("guide-target"); next.scrollIntoView({ block: "center" }); }
        setStep(next.dataset.guideStep ?? "1"); setInstruction(next.dataset.guideTitle ?? (role === 'provider' ? 'guide_choose' : 'guide_analyze')); setTarget("visible");
      } else { highlighted?.classList.remove("guide-target"); highlighted = null; setTarget(timedOut ? "missing" : "waiting"); }
    };
    const observer = new MutationObserver(detect);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-guide-target', 'disabled', 'data-guide-complete'] });
    timer = setTimeout(() => { timedOut = true; if (!highlighted) setTarget("missing"); }, 3000);
    detect();
    return () => { clearTimeout(timer); observer.disconnect(); highlighted?.classList.remove("guide-target"); };
  }, [role, location.pathname]);
  if (role !== "provider" && role !== "maintainer") return null;
  return (
    <aside className="guide panel" aria-label={text.demo} data-testid="guide">
      <p className="kicker">
        {text[role === "provider" ? "demo_provider" : "demo_maintainer"]} ·{" "}
        {text.guide_progress} {step}
      </p>
      <h2>{target === "complete" ? text.guide_complete : text[instruction as keyof typeof text]}</h2>
      <p role={target === "missing" ? "alert" : "status"}>
        {target === "complete" ? text.guide_complete : target === "waiting"
          ? text.loading
          : target === "missing"
            ? text.guide_missing
            : text.guide_click}
      </p>
      {target === "missing" && <Link to="/demo">{text.guide_return}</Link>}
      <button
        onClick={() => {
          const query = new URLSearchParams(location.search);
          query.delete("demo");
          navigate(
            { pathname: location.pathname, search: query.toString() },
            { replace: true },
          );
        }}
      >
        {text.guide_exit}
      </button>
    </aside>
  );
}
