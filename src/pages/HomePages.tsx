import { Component, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useLocale } from "../i18n/LocaleProvider.js";
import { localize } from "../i18n/locale.js";
import type {
  ContributorProfile,
  ImpactSnapshot,
  MarketplaceSnapshot,
} from "../../shared/home.js";
import { useSnapshot } from "../services/snapshots.js";
import {
  CampaignBrowser,
  CommitmentFlow,
  DonorMap,
  Hero,
  ReleaseUpdate,
  RequestState,
} from "../components/HomeComponents.js";
import { CommentWall, CommunityVotes } from "../components/Community.js";
import { DemoLauncher } from "../components/GuidedDemo.js";
import "../styles/home.css";
import { WorkflowStory } from '../components/WorkflowStory.js';
export function HomePage() {
  const impact = useSnapshot<ImpactSnapshot>("/api/impact", true),
    market = useSnapshot<MarketplaceSnapshot>("/api/marketplace", true);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (
      !("IntersectionObserver" in window) ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0, rootMargin: "0px 0px -12% 0px" },
    );
    ref.current
      ?.querySelectorAll(":scope > section")
      .forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  return (
    <main className="home-content" id="main-content" tabIndex={-1} ref={ref}>
      <Hero impact={impact.data} market={market.data} />
      <WorkflowStory />
      <CommitmentFlow />
      <DonorMap snapshot={impact} />
      <CampaignBrowser embedded snapshot={market} />
      <ReleaseUpdate market={market.data} />
    </main>
  );
}
export function MarketplacePage() {
  const { text, locale } = useLocale();
  const snapshot = useSnapshot<MarketplaceSnapshot>("/api/marketplace", true);
  return (
    <main className="product-content" id="main-content" tabIndex={-1}>
      <header className="market-heading">
        <p className="kicker">{text.demo_data}</p>
        <h1>{text.market_title}</h1>
        <p>{text.market_intro}</p>
        <dl className="signals">
          {[
            [text.compute_committed, snapshot.data?.stats.totalPledged],
            [text.releases_shipped, snapshot.data?.stats.missionsShipped],
            [text.backers, snapshot.data?.stats.contributors],
          ].map(([label, n]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{typeof n === "number" ? n.toLocaleString(locale) : "—"}</dd>
            </div>
          ))}
        </dl>
      </header>
      <CampaignBrowser embedded={false} snapshot={snapshot} />
      <section className="create-callout panel">
        <h2>{text.create_heading}</h2>
        <p>{text.create_note}</p>
        <Link className="button" to="/new">
          {text.new_mission} →
        </Link>
      </section>
    </main>
  );
}
export function ProfilePage() {
  const { id = "" } = useParams();
  const { text, locale } = useLocale();
  const snapshot = useSnapshot<ContributorProfile>(
    `/api/contributors/${encodeURIComponent(id)}`,
  );
  if (snapshot.error === 404) return <RecoveryPage />;
  const p = snapshot.data;
  return (
    <main className="product-content" id="main-content" tabIndex={-1}>
      <RequestState snapshot={snapshot} />
      {p && (
        <div data-testid="contributor-impact">
          <p className="kicker">
            {text.profile} · {text.demo_data}
          </p>
          <header className="profile-header panel">
            <div className="avatar" style={{ background: p.avatarColor }}>
              {p.name.slice(0, 1)}
            </div>
            <div>
              <h1>{p.name}</h1>
              <p>@{p.handle}</p>
              <p>{localize(p.bio, locale)}</p>
              <p>{text.contributor_impact_identity}</p>
            </div>
            <dl>
              <dt>{text.wallet}</dt>
              <dd>{p.walletBalance.toLocaleString(locale)}</dd>
              <dt>{text.reputation}</dt>
              <dd>{p.reputation}</dd>
            </dl>
          </header>
          <dl className="profile-stats">
            {[
              [text.pledged, p.totalPledged],
              [text.supported, p.stats.missionsSupported],
              [text.releases_shipped, p.stats.localReleases],
            ].map(([label, value]) => (
              <div className="panel" key={label}>
                <dd>{value}</dd>
                <dt>{label}</dt>
              </div>
            ))}
          </dl>
          <section>
            <h2>{text.achievements}</h2>
            {!p.achievements.length && <p>{text.empty_records}</p>}
            <div className="achievement-grid">
              {p.achievements.map((a) => (
                <div className="panel" key={a.id}>
                  <h3>
                    {localize(
                      p.achievementDefs.find((d) => d.code === a.code)?.name ??
                        text.unknown,
                      locale,
                    )}
                  </h3>
                  <p>
                    {localize(
                      p.achievementDefs.find((d) => d.code === a.code)
                        ?.description ?? text.unknown,
                      locale,
                    )}
                  </p>
                  <span>
                    {text.demo_data} · {a.earnedAt}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2>{text.receipts}</h2>
            {!p.receipts.length && <p>{text.empty_records}</p>}
            {p.receipts.map((r) => (
              <div className="receipt panel" key={r.missionId}>
                <Link to={`/missions/${r.missionId}`}>{r.missionId}</Link>
                <span>
                  {r.pledged} {text.pledged}
                </span>
                <span>{text[`status_${r.status}` as keyof typeof text]}</span>
                <span>{text.demo_data}</span>
              </div>
            ))}
          </section>
          <section>
            <h2>{text.pledges}</h2>
            {!p.pledges.length && <p>{text.empty_records}</p>}
            {p.pledges.map((pledge) => (
              <div className="receipt panel" key={pledge.id}>
                <Link to={`/missions/${pledge.missionId}`}>
                  {localize(pledge.mission.title, locale)}
                </Link>
                <span>
                  {pledge.amount} {text.pledged}
                </span>
                <time>{pledge.createdAt}</time>
              </div>
            ))}
          </section>
        </div>
      )}
    </main>
  );
}
export function DemoPage() {
  const { text } = useLocale();
  return (
    <main className="product-content demo-page" id="main-content" tabIndex={-1}>
      <p className="kicker">{text.demo_data}</p>
      <h1>{text.demo_title}</h1>
      <p>{text.demo_explanation}</p>
      <DemoLauncher />
    </main>
  );
}
export function RecoveryPage({ error = false }: { error?: boolean }) {
  const { text } = useLocale();
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="recovery"
      data-testid="route-recovery"
    >
      <span className="recovery-icon" aria-hidden="true">
        {error ? "!" : "?"}
      </span>
      <h1>
        {error ? text.route_recovery_error : text.route_recovery_notFound}
      </h1>
      {error ? (
        <button onClick={() => window.location.reload()}>{text.reload}</button>
      ) : (
        <Link className="button" to="/">
          {text.back_home}
        </Link>
      )}
    </main>
  );
}
export class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? <RecoveryPage error /> : this.props.children;
  }
}
/** A-owned community surface hosted at the future B mission route; no mission execution is simulated. */
export function MissionCommunityPage() {
  const { id = "" } = useParams();
  const { text, locale } = useLocale();
  const snapshot = useSnapshot<MarketplaceSnapshot>("/api/marketplace");
  const mission = snapshot.data?.sections
    .flatMap((s) => s.missions)
    .find((m) => m.id === id);
  if (snapshot.data && !mission) return <RecoveryPage />;
  return (
    <main className="product-content" id="main-content" tabIndex={-1}>
      <RequestState snapshot={snapshot} />
      {mission && (
        <>
          <h1>{localize(mission.title, locale)}</h1>
          <p className="module-notice">{text.module_unavailable}</p>
          <p>{text.demo_data}</p>
          <div className="community-grid">
            <CommentWall key={id} missionId={id} />
            <CommunityVotes />
          </div>
        </>
      )}
    </main>
  );
}
