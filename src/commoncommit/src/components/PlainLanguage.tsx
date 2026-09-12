import { useId } from "react";
import { Check, ChevronRight } from "lucide-react";
import { useI18n } from "../i18n/index.js";
import { GeneratorBadge } from "./ui.js";
import type { PlainLanguage as PlainLanguageData } from "../../shared/types.js";

/**
 * A repository explained to someone who will never open its README.
 *
 * Reading order is the whole design: emoji → one sentence → concrete uses →
 * (only then, folded away) the repository's own technical wording. The technical
 * summary is present because hiding it would be its own kind of dishonesty, but
 * it is never the first thing, because "what it is for" is what a non-engineer
 * came for.
 *
 * The provenance badge is not decoration. A plain-language summary is a CLAIM
 * about what software does; when it came from the bundled demo copy rather than a
 * model reading the repository, the reader has to be able to see that in the same
 * glance as the sentence itself — hence the note sits directly under the
 * one-liner, not in a tooltip or a page footer.
 */
export function PlainLanguage({
  plain,
  className = "",
}: {
  plain: PlainLanguageData;
  className?: string;
}) {
  const { t, lt } = useI18n();
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={`cc-glass rounded-2xl p-5 sm:p-6 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="text-sm font-semibold uppercase tracking-wide text-dim">
          {t("plain.title")}
        </h2>
        <GeneratorBadge generator={plain.generator} />
      </div>

      <div className="flex items-start gap-4">
        {/* Aria-hidden: the emoji is a mood, not information. Announcing
            "package emoji" before the sentence only slows a screen reader down. */}
        <span aria-hidden className="shrink-0 text-4xl leading-none sm:text-5xl">
          {plain.emoji}
        </span>
        <p className="text-lg font-semibold leading-snug tracking-tight text-ink sm:text-2xl">
          {lt(plain.oneLiner)}
        </p>
      </div>

      {plain.generator === "demo" && (
        <p className="mt-3 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-xs leading-relaxed text-warn">
          {t("plain.demoNote")}
        </p>
      )}

      {plain.useCases.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-dim">
            {t("plain.useCases")}
          </h3>
          <ul className="space-y-1.5">
            {plain.useCases.map((useCase, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-mut">
                {/* Brand teal, deliberately NOT the verification green: these are
                    generated suggestions, and a green tick is the codebase's
                    established mark for something the engine actually observed. */}
                <Check size={15} className="mt-0.5 shrink-0 text-brand2" aria-hidden />
                <span>{lt(useCase)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="group mt-5 rounded-lg border border-line bg-bg2/60">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-xs font-semibold text-mut hover:text-ink [&::-webkit-details-marker]:hidden">
          <ChevronRight size={14} className="shrink-0 transition-transform group-open:rotate-90" aria-hidden />
          {t("plain.technical")}
        </summary>
        <p className="border-t border-line px-3 py-3 text-sm leading-relaxed text-mut">
          {lt(plain.technicalSummary)}
        </p>
      </details>
    </section>
  );
}
