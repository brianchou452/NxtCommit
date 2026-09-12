import type { MissionDetail } from "../../shared/mission.js";
import { localize } from "../i18n/locale.js";
import { useLocale } from "../i18n/LocaleProvider.js";
export function CatalogContent({ mission }: { mission: MissionDetail }) {
  const { locale, text } = useLocale();
  const content = mission.catalog;
  if (!content) return null;
  const facts = [
    ["catalog_language", mission.project.language],
    ["catalog_license", mission.project.license],
    ["catalog_stars", mission.project.stars],
    ["catalog_downloads", mission.project.weeklyDownloads],
    ["catalog_dependents", mission.project.dependents],
  ].filter(([, value]) => value !== undefined);
  return (
    <section
      className="mission-story-section catalog-content"
      id="catalog-history"
      data-testid="catalog-content"
    >
      <p className="mission-provenance">{text.catalog_note}</p>
      {!!facts.length && (
        <>
          <h2>{text.catalog_facts}</h2>
          <dl>
            {facts.map(([key, value]) => (
              <div key={key}>
                <dt>{text[key as keyof typeof text]}</dt>
                <dd>
                  {typeof value === "number"
                    ? value.toLocaleString(locale)
                    : value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
      <h2>{text.catalog_scope}</h2>
      <p>
        <strong>{content.issue.id}</strong> ·{" "}
        {localize(content.issue.title, locale)}
      </p>
      <h3>
        {text.mission_risk} ·{" "}
        {text[`catalog_risk_${content.riskLevel}` as keyof typeof text]}
      </h3>
      <ul>
        {content.riskFactors.map((risk, i) => (
          <li key={i}>{localize(risk, locale)}</li>
        ))}
      </ul>
      {content.releaseVersion && (
        <p>
          <strong>
            {text.catalog_release}: v{content.releaseVersion.replace(/^v/, "")}
          </strong>
          {content.releasedAt && (
            <>
              {" "}
              ·{" "}
              <time dateTime={content.releasedAt}>
                {new Date(content.releasedAt).toLocaleDateString(locale)}
              </time>
            </>
          )}
        </p>
      )}
      {content.adoption && (
        <p>
          {text.catalog_adoption}:{" "}
          {content.adoption.weeklyDownloads.toLocaleString(locale)} ·{" "}
          {text.demo_data}
        </p>
      )}
      {content.history.map((history, i) => (
        <details key={i}>
          <summary>
            {text.catalog_history} ·{" "}
            {text[`status_${content.originalStatus}` as keyof typeof text]}
          </summary>
          <ol>
            {history.events.map((event, index) => (
              <li key={index}>
                <strong>{localize(event.title, locale)}</strong>
                {event.detail && <p>{localize(event.detail, locale)}</p>}
              </li>
            ))}
          </ol>
        </details>
      ))}
      {content.artifact && (
        <details>
          <summary>
            {text.catalog_artifact}: {localize(content.artifact.title, locale)}
          </summary>
          <p>{localize(content.artifact.summary, locale)}</p>
          {content.artifact.files.map((file) => (
            <details key={file.path}>
              <summary>{file.path}</summary>
              <pre>{file.diff}</pre>
            </details>
          ))}
        </details>
      )}
    </section>
  );
}
