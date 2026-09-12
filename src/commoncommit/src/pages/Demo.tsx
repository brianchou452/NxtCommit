import { LiveAgentFeed } from "../components/LiveAgentFeed.js";
import { DemoShowcase } from "../components/DemoShowcase.js";
import { useI18n } from "../i18n/index.js";

export default function Demo() {
  const { t } = useI18n();
  return (
    <div className="pb-16 pt-10">
      <header className="mx-auto mb-10 max-w-3xl text-center">
        <p className="font-mono text-[14px] font-bold uppercase tracking-[.18em] text-fund">{t("demo.page.kicker")}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-.045em] sm:text-6xl">{t("demo.page.title")}</h1>
        <p className="mt-5 text-base leading-relaxed text-mut">{t("demo.page.body")}</p>
      </header>
      <DemoShowcase /><div className="mt-10"><LiveAgentFeed /></div>
    </div>
  );
}
