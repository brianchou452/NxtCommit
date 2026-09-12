import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLocale } from "../i18n/LocaleProvider.js";
import { resetDemo } from "../services/api.js";
export function DemoLauncher() {
  const { text } = useLocale();
  const navigate = useNavigate();
  const [state, setState] = useState<"ready" | "resetting" | "error">("ready");
  async function launch(role: "provider" | "maintainer") {
    if (state === "resetting") return;
    setState("resetting");
    try {
      await resetDemo();
      navigate(`${role === "provider" ? "/marketplace" : "/new"}?demo=${role}`);
    } catch {
      setState("error");
    }
  }
  return (
    <>
      <p className="reset-disclosure">{text.demo_reset_notice}</p>
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
  const [target, setTarget] = useState<"waiting" | "visible" | "missing">(
    "waiting",
  );
  useEffect(() => {
    if (role !== "provider" && role !== "maintainer") return;
    setTarget("waiting");
    let highlighted: Element | null = null;
    let timer: ReturnType<typeof setTimeout>;
    const selector =
      role === "provider" && location.pathname === "/marketplace"
        ? '[data-guide-target="campaign"]'
        : role === "maintainer" && location.pathname === "/new"
          ? '[data-guide-target="analyze"]'
          : '[data-guide-target="next"]';
    function detect() {
      highlighted = document.querySelector(selector);
      if (highlighted) {
        highlighted.classList.add("guide-target");
        highlighted.scrollIntoView({ block: "center" });
        setTarget("visible");
        observer.disconnect();
        clearTimeout(timer);
      }
    }
    const observer = new MutationObserver(detect);
    observer.observe(document.body, { childList: true, subtree: true });
    timer = setTimeout(() => {
      observer.disconnect();
      setTarget("missing");
    }, 3000);
    detect();
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      highlighted?.classList.remove("guide-target");
    };
  }, [role, location.pathname]);
  if (role !== "provider" && role !== "maintainer") return null;
  return (
    <aside className="guide panel" aria-label={text.demo} data-testid="guide">
      <p className="kicker">
        {text[role === "provider" ? "demo_provider" : "demo_maintainer"]} ·{" "}
        {text.guide_progress} 1
      </p>
      <h2>{text[role === "provider" ? "guide_choose" : "guide_analyze"]}</h2>
      <p role={target === "missing" ? "alert" : "status"}>
        {target === "waiting"
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
