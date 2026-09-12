import { mapLabels } from "../../shared/map-layout.js";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLocale } from "../i18n/LocaleProvider.js";
import type { Dictionary } from "../i18n/en.js";
import { localize } from "../i18n/locale.js";
import type {
  Campaign,
  ImpactSnapshot,
  MarketplaceSnapshot,
} from "../../shared/home.js";
import {
  editorialGroups,
  fundable,
  releaseCampaign,
} from "../../shared/home-domain.js";
import type { Snapshot } from "../services/snapshots.js";
import land from "../../spec/assets/world-map/world-land-110m.svg";
import tokenStream from "../../spec/assets/home/nxtcommit-token-stream.png";
export function RequestState({
  snapshot,
}: {
  snapshot: Pick<Snapshot<unknown>, "loading" | "error" | "reload">;
}) {
  const { text } = useLocale();
  return (
    <>
      {snapshot.error && (
        <div role="alert">
          <p>{text.error_generic}</p>
          <button onClick={snapshot.reload}>{text.retry}</button>
        </div>
      )}
      {snapshot.loading && <p role="status">{text.loading}</p>}
    </>
  );
}
export function Hero({
  impact,
  market,
}: {
  impact: ImpactSnapshot | undefined;
  market: MarketplaceSnapshot | undefined;
}) {
  const { text, locale } = useLocale();
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setActive((n) => (n + 1) % 3), 4200);
    return () => clearInterval(timer);
  }, []);
  const stats = [
    [text.compute_committed, market?.stats.totalPledged],
    [text.backers, market?.stats.contributors],
    [text.repos_moved, impact?.stats.projectsRevived],
    [text.releases_shipped, market?.stats.missionsShipped],
  ] as const;
  return (
    <section id="hero" className="hero">
      <div>
        <p className="kicker">
          {text.product} · {text.demo_data}
        </p>
        <h1>
          {text.hero_headline_line_1}
          <span>{text.hero_headline_line_2}</span>
        </h1>
        <p>{text.hero_supporting_text}</p>
        <a className="button primary" href="#projects">
          {text.hero_primary_cta} →
        </a>
        <dl className="signals">
          {stats.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {value === undefined
                  ? "—"
                  : new Intl.NumberFormat(locale).format(value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="pipeline">
        <p className="kicker">
          {text.hero_pipeline_title} · {text.hero_provenance_label}
        </p>
        <h2>{text.hero_pipeline_subtitle}</h2>
        <img src={tokenStream} alt="" className="token-stream" />
        <ol>
          {[text.hero_event_1, text.hero_event_2, text.hero_event_3].map(
            (event, i) => (
              <li key={event} className={active === i ? "highlight" : ""}>
                {event}
              </li>
            ),
          )}
        </ol>
        <p className="fine">{text.hero_provenance_note}</p>
      </div>
    </section>
  );
}
export function CommitmentFlow() {
  const { text } = useLocale();
  return (
    <section id="how" className="flow panel">
      <h2>{text.commitment_flow_title}</h2>
      <ol>
        {text.commitment_flow_steps.split(" | ").map((step, i) => (
          <li key={step}>
            <span aria-hidden="true">{i + 1}</span>
            <p>{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
export function DonorMap({ snapshot }: { snapshot: Snapshot<ImpactSnapshot> }) {
  const { text, locale } = useLocale();
  const [pinned, setPinned] = useState("");
  const [hover, setHover] = useState("");
  const data = snapshot.data;
  const beacons = data?.beacons ?? [],
    selected = beacons.find((b) => b.contributorId === (hover || pinned));
  const pin = (id: string) => setPinned((old) => (old === id ? "" : id));
  return (
    <section id="map">
      <h2>{text.map_title}</h2>
      <div className="map-panel panel">
        <RequestState snapshot={snapshot} />
        {data && (
          <>
            <div className="map-controls">
              <div>
                <p className="kicker">{text.donor_world_map_pool_title}</p>
                <strong className="pool">
                  {new Intl.NumberFormat(locale).format(
                    beacons.reduce((n, b) => n + b.tokens, 0),
                  )}
                </strong>
              </div>
              <span className="badge">{text.demo_data}</span>
              <label>
                {text.donor_world_map_explore}
                <select
                  value={pinned}
                  onChange={(e) => setPinned(e.target.value)}
                >
                  <option value="">{text.donor_world_map_choose}</option>
                  {beacons.map((b) => (
                    <option key={b.contributorId} value={b.contributorId}>
                      {b.city}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!beacons.length ? (
              <p>{text.donor_world_map_empty}</p>
            ) : (
              <>
                <p>
                  {text.donor_world_map_community_summary
                    .replace("{backers}", String(beacons.length))
                    .replace(
                      "{cities}",
                      String(
                        new Set(beacons.map((b) => b.city + b.country)).size,
                      ),
                    )}
                </p>
                <div className="world-map">
                  <img className="land" src={land} alt="" />
                  <svg
                    viewBox="0 0 1000 500"
                    aria-hidden="true"
                    className="graticules"
                  >
                    {Array.from({ length: 13 }, (_, i) => (
                      <path key={`x${i}`} d={`M ${(i * 1000) / 12} 0 V 500`} />
                    ))}
                    {Array.from({ length: 7 }, (_, i) => (
                      <path key={`y${i}`} d={`M 0 ${(i * 500) / 6} H 1000`} />
                    ))}
                  </svg>
                  {beacons.map((b) => (
                    <button
                      className="beacon"
                      aria-label={`${b.city}, ${b.country}`}
                      aria-pressed={pinned === b.contributorId}
                      key={b.contributorId}
                      onClick={() => pin(b.contributorId)}
                      onMouseEnter={() => setHover(b.contributorId)}
                      onMouseLeave={() => setHover("")}
                      onFocus={() => setHover(b.contributorId)}
                      onBlur={() => setHover("")}
                      style={{
                        left: `${(b.lng + 180) / 3.6}%`,
                        top: `${(90 - b.lat) / 1.8}%`,
                      }}
                    >
                      <span
                        style={{
                          width: Math.min(24, 7 + Math.sqrt(b.tokens) / 3),
                          height: Math.min(24, 7 + Math.sqrt(b.tokens) / 3),
                        }}
                      />
                    </button>
                  ))}
                  <svg
                    viewBox="0 0 1000 500"
                    className="map-labels"
                    aria-hidden="true"
                  >
                    {mapLabels(beacons).map((label) => (
                      <text key={label.id} x={label.x} y={label.y}>
                        {label.city}
                      </text>
                    ))}
                  </svg>
                  {selected && (
                    <div
                      className="map-detail"
                      role="status"
                      style={{
                        left: `${Math.max(2, Math.min(70, (selected.lng + 180) / 3.6))}%`,
                        top: `${Math.max(2, Math.min(70, (90 - selected.lat) / 1.8 - 15))}%`,
                      }}
                    >
                      <strong>
                        {selected.city}, {selected.country}
                      </strong>
                      <div>@{selected.handle}</div>
                      <span>
                        {selected.tokens.toLocaleString(locale)}{" "}
                        {text.donor_world_map_beacon_amount}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
export function CampaignCard({
  campaign,
  featured = false,
  guide = false,
}: {
  campaign: Campaign;
  featured?: boolean;
  guide?: boolean;
}) {
  const { text, locale } = useLocale();
  const location = useLocation();
  const ratio =
    campaign.computeGoal > 0
      ? Math.min(1, campaign.computePledged / campaign.computeGoal)
      : undefined;
  const query = new URLSearchParams(location.search).get("demo");
  const suffix =
    query === "provider" || query === "maintainer" ? `?demo=${query}` : "";
  return (
    <article
      className={`campaign ${featured ? "featured" : ""}`}
      data-testid="campaign-card"
      data-mission-id={campaign.id}
    >
      <div className={`art art-${campaign.project.slug}`} aria-hidden="true">
        <span>◈</span>
        <strong>{campaign.project.name}</strong>
      </div>
      <div className="campaign-body">
        <div className="card-identity">
          <span>
            {text.campaign_card_repo} / {campaign.project.name}
          </span>
          <span className={`badge status-${campaign.status}`}>
            {text[`status_${campaign.status}`]}
          </span>
        </div>
        <h3>{localize(campaign.title, locale)}</h3>
        {featured && <p>{localize(campaign.project.description, locale)}</p>}
        <div className="benefit">
          <span className="kicker">{text.campaign_card_benefit}</span>
          <p>{localize(campaign.story.why, locale) || "—"}</p>
        </div>
        <div className="card-provenance">
          <span>
            {campaign.generator === "demo" ? text.demo_copy : text.model_copy}
          </span>{" "}
          ·{" "}
          <span>
            {campaign.project.figuresMode === "demo"
              ? text.figures_demo
              : text.figures_live}
          </span>
        </div>
        <div className="funding">
          {ratio !== undefined && (
            <meter
              min={0}
              max={1}
              value={ratio}
              aria-label={text.campaign_card_funded}
            />
          )}
          <div>
            {campaign.computePledged.toLocaleString(locale)} /{" "}
            {campaign.computeGoal.toLocaleString(locale)}{" "}
            <span>
              {ratio === undefined ? "—" : `${Math.round(ratio * 100)}%`}{" "}
              {text.campaign_card_funded}
            </span>
          </div>
        </div>
        <div className="card-action">
          <span>
            {campaign.backerCount} {text.campaign_card_backers}
          </span>
          <Link
            data-guide-target={guide ? "campaign" : undefined}
            to={`/missions/${campaign.id}${suffix}`}
          >
            {fundable(campaign)
              ? text.campaign_card_fundable_cta
              : text.campaign_card_closed_cta}{" "}
            →
          </Link>
        </div>
      </div>
    </article>
  );
}
export function CampaignBrowser({
  snapshot,
  embedded,
}: {
  snapshot: Snapshot<MarketplaceSnapshot>;
  embedded: boolean;
}) {
  const { text } = useLocale();
  const categories: Record<string, keyof Dictionary> = {
    everyday: "campaign_browser_everyday",
    "public-interest": "campaign_browser_independence",
    "builder-trend": "campaign_browser_frontier",
  };
  const groups = embedded
    ? editorialGroups(snapshot.data)
    : (snapshot.data?.sections ?? []);
  return (
    <section id="projects">
      <h2>{text.campaign_title}</h2>
      <RequestState snapshot={snapshot} />
      {!snapshot.data && snapshot.loading && (
        <div className="skeletons" aria-hidden="true">
          <div />
          <div />
        </div>
      )}
      {snapshot.data && !groups.length && <p>{text.empty_campaigns}</p>}
      {groups.map((group, index) => (
        <div className="category" key={group.key} data-testid="category">
          <div className="category-banner">
            <p className="kicker">
              {text.campaign_browser_category_kicker} · {text.demo_data}
            </p>
            <h2>
              {
                text[
                  embedded
                    ? categories[group.key]!
                    : (`shelf_${group.key}` as keyof Dictionary)
                ]
              }
            </h2>
            <span>{group.missions.length}</span>
          </div>
          <div className="campaign-grid">
            {group.missions.slice(0, 5).map((m, i) => (
              <CampaignCard
                key={m.id}
                campaign={m}
                featured={i === 0}
                guide={index === 0 && i === 0}
              />
            ))}
          </div>
          {group.missions.length > 5 && (
            <details>
              <summary>
                {text.campaign_browser_more} ({group.missions.length - 5})
              </summary>
              <div className="more-grid">
                {group.missions.slice(5).map((m) => (
                  <CampaignCard key={m.id} campaign={m} />
                ))}
              </div>
            </details>
          )}
        </div>
      ))}
    </section>
  );
}
export function ReleaseUpdate({
  market,
}: {
  market: MarketplaceSnapshot | undefined;
}) {
  const { text } = useLocale();
  const release = releaseCampaign(market);
  const body = (
    <>
      <div className="release-heading">
        <p className="kicker">{text.release_update_eyebrow}</p>
        <h2>{text.release_update_title}</h2>
        <p>{text.release_update_body}</p>
      </div>
      <ol>
        {text.release_update_stages.split(" | ").map((s, i) => (
          <li key={s}>
            <span>{i + 1}</span>
            {s}
            <small>{text.release_update_complete}</small>
          </li>
        ))}
      </ol>
      <div className="release-footer">
        <strong>{text.release_update_impact}</strong>
        <p>{text.release_update_provenance_note}</p>
        {release && <span>{text.release_update_open} →</span>}
      </div>
    </>
  );
  return (
    <section id="mvp">
      <h2>{text.release_heading}</h2>
      {release ? (
        <Link className="release-card" to={`/missions/${release.id}`}>
          {body}
        </Link>
      ) : (
        <div className="release-card">{body}</div>
      )}
    </section>
  );
}
