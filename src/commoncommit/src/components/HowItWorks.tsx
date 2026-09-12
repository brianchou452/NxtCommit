import { ArrowRight, Bot, GitMerge, HandCoins, Search } from "lucide-react";
import { useI18n, type TKey } from "../i18n/index.js";

const STEPS: Array<{ key: string; title: TKey; body: TKey; icon: typeof Search }> = [
  { key: "discover", title: "home.how.discover", body: "home.how.discover.body", icon: Search },
  { key: "back", title: "home.how.back", body: "home.how.back.body", icon: HandCoins },
  { key: "build", title: "home.how.build", body: "home.how.build.body", icon: Bot },
  { key: "merge", title: "home.how.merge", body: "home.how.merge.body", icon: GitMerge },
];

/** A compact, horizontally-scannable bridge from the promise to campaigns. */
export function HowItWorks() {
  const { t } = useI18n();

  return (
    <div className="cc-commitment-flow overflow-x-auto border border-line bg-bg1 shadow-[0_18px_50px_rgba(57,47,120,.07)]">
      <h2 className="sr-only">{t("home.how.title")}</h2>
      <p className="cc-commitment-flow-title font-bold tracking-[-.015em] text-ink">
        {t("home.hero.commitment")}
      </p>
      <ol className="cc-commitment-flow-steps grid min-w-[720px] grid-cols-4">
        {STEPS.map(({ key, title, body, icon: Icon }, index) => (
          <li key={key} className="cc-commitment-flow-step relative flex min-w-0 items-center">
            <span className="cc-commitment-flow-icon inline-flex shrink-0 items-center justify-center rounded-full bg-fund/10 text-fund">
              <Icon size={19} aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold tracking-tight text-ink">{t(title)}</h3>
              <p className="leading-snug text-mut">{t(body)}</p>
            </div>
            {index < STEPS.length - 1 && (
              <ArrowRight
                size={17}
                className="absolute -right-2 top-1/2 z-10 -translate-y-1/2 text-fund"
                aria-hidden
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
