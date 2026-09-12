import { useEffect, useRef } from "react";
import { useI18n } from "../i18n/index.js";
import { Hero } from "../components/Hero.js";
import { HowItWorks } from "../components/HowItWorks.js";
import { WorldMap } from "../components/WorldMap.js";
import { MonthlyMvp } from "../components/MonthlyMvp.js";
import Marketplace from "./Marketplace.js";
import { SectionHeading } from "../components/ui.js";
import { useImpactSnapshot } from "../lib/useImpactSnapshot.js";

/**
 * Section rhythm. `--space-section*` exists so a section cannot drift to an
 * arbitrary gap; the smaller value is used below `md` because a 7rem gap on a
 * 390px screen reads as an empty screen rather than as breathing room.
 */
const SECTION = "scroll-mt-24 pt-10 md:pt-14";

export default function Home() {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const impact = useImpactSnapshot();

  /**
   * One observer for every `.cc-reveal` on the page. Each element is unobserved
   * once it has entered — a reveal is a first-arrival effect, and re-running it
   * on scroll-back would make static content look like it had changed.
   */
  useEffect(() => {
    const nodes = rootRef.current?.querySelectorAll<HTMLElement>(".cc-reveal");
    if (!nodes || nodes.length === 0) return;
    if (!("IntersectionObserver" in window)) {
      // Without the observer the reveal class would leave content at opacity 0.
      nodes.forEach((node) => node.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      /*
       * threshold 0, never a ratio. A ratio is a share of the TARGET, so a
       * section taller than roughly 12 viewports can never reach 8% no matter how
       * far it is scrolled — and `.cc-reveal` starts at opacity 0, so failing to
       * reveal does not degrade to "unanimated", it deletes the content. The
       * project list is the section most likely to grow to that height.
       * The negative bottom margin is what delays the reveal until the section is
       * properly in view rather than one pixel past the fold.
       */
      { threshold: 0, rootMargin: "0px 0px -12% 0px" }
    );
    nodes.forEach((node) => io.observe(node));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="pb-8">
      <Hero impact={impact.state} />

      <section id="how" className="scroll-mt-24 pt-4 sm:pt-5 cc-reveal">
        <HowItWorks />
      </section>

      <section id="map" className={`${SECTION} cc-reveal`}>
        <SectionHeading title={t("home.section.map")} />
        <WorldMap state={impact.state} onRetry={impact.retry} />
      </section>

      <section id="projects" className={`${SECTION} cc-reveal`}>
        <SectionHeading title={t("home.section.projects")} />
        {/*
          The existing marketplace shelves, reused rather than reimplemented. They
          already own the section logic, the SSE refresh and the empty states, and a
          second copy of that would drift. What changed is the CARD it renders.
        */}
        <Marketplace embedded />
      </section>

      <section id="mvp" className={`${SECTION} cc-release-section cc-reveal`}>
        <div className="cc-release-heading">
          <h2>{t("home.section.mvp")}</h2>
          <p>{t("home.section.mvpSub")}</p>
        </div>
        <MonthlyMvp />
      </section>
    </div>
  );
}
