import { useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Bug,
  Cpu,
  Download,
  Gem,
  GitPullRequest,
  LifeBuoy,
  Lock,
  Moon,
  Network,
  PackageCheck,
  Receipt,
  Rocket,
  ShieldCheck,
  Sparkles,
  Sunrise,
  Trophy,
  Zap,
} from "lucide-react";
import type { ContributorProfile } from "../../shared/home.js";
import { useLocale } from "../i18n/LocaleProvider.js";
import { localize } from "../i18n/locale.js";
import { useSnapshot } from "../services/snapshots.js";
import { RequestState } from "../components/HomeComponents.js";
import { RecoveryPage } from "./HomePages.js";
import "../styles/commitment.css";

const icons = {
  Sparkles,
  Sunrise,
  Rocket,
  PackageCheck,
  LifeBuoy,
  ShieldCheck,
  Gem,
  Network,
  Bug,
  BookOpen,
  Cpu,
  Moon,
};
const accents: Record<string, string> = {
  first_spark: "funding",
  early_backer: "funding",
  final_push: "funding",
  ship_it: "verification",
  project_rescuer: "verification",
  security_guardian: "development",
  hidden_gem: "adoption",
  dependency_defender: "development",
  first_bug_hero: "danger",
  documentation_angel: "funding",
  ai_architect: "adoption",
  oss_guardian: "development",
  night_owl_sponsor: "funding",
};
type Definition = ContributorProfile["achievementDefs"][number];
function Badge({
  definition,
  locked = false,
}: {
  definition: Definition;
  locked?: boolean;
}) {
  const { locale } = useLocale();
  const Icon = icons[definition.icon as keyof typeof icons] ?? Trophy;
  return (
    <span
      className={`mc-badge ${locked ? "is-locked" : `tier-${definition.tier}`}`}
      title={localize(definition.description, locale)}
      style={
        {
          "--mc-accent": `var(--${accents[definition.code] ?? "funding"})`,
        } as CSSProperties
      }
    >
      <span className="mc-badge-icon" aria-hidden="true">
        {locked ? <Lock size={12} /> : <Icon size={16} />}
      </span>
      {localize(definition.name, locale)}
    </span>
  );
}
function Credits({ value }: { value: number | undefined }) {
  const { locale, text } = useLocale();
  return (
    <span
      className="mc-credits"
      title={value === undefined ? text.commitment_unknown : undefined}
    >
      {value === undefined ? (
        "—"
      ) : (
        <>
          <Zap size={15} aria-hidden="true" fill="currentColor" />
          <span>{value.toLocaleString(locale)}</span>
        </>
      )}
    </span>
  );
}
function Stage({ tone, children }: { tone?: string; children: ReactNode }) {
  return (
    <span className={`mc-stage ${tone ? `tone-${tone}` : "is-pending"}`}>
      {children}
    </span>
  );
}
function Arrow() {
  return <ArrowRight className="mc-chain-arrow" size={13} aria-hidden="true" />;
}
function Empty({ icon }: { icon: ReactNode }) {
  const { text } = useLocale();
  return (
    <div className="mc-empty">
      {icon}
      <p>{text.empty_records}</p>
    </div>
  );
}
function Status({ status }: { status: string }) {
  const { text } = useLocale();
  return (
    <span className={`mc-status status-${status}`}>
      {text[`status_${status}` as keyof typeof text] ?? text.unknown}
    </span>
  );
}
function relativeDate(value: string, locale: string) {
  const seconds = (Date.parse(value) - Date.now()) / 1000;
  const units = [
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
    [1, "second"],
  ] as const;
  const [size, unit] =
    units.find(([size]) => Math.abs(seconds) >= size) ?? units[3];
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    Math.round(seconds / size),
    unit,
  );
}
function DateLabel({
  value,
  relative = false,
}: {
  value: string | undefined;
  relative?: boolean;
}) {
  const { locale, text } = useLocale();
  if (!value || !Number.isFinite(Date.parse(value)))
    return <span>{text.commitment_unknown}</span>;
  return (
    <time dateTime={value} title={new Date(value).toLocaleString(locale)}>
      {relative
        ? relativeDate(value, locale)
        : new Date(value).toLocaleDateString(locale, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
    </time>
  );
}
function Skeleton() {
  const { text } = useLocale();
  return (
    <div className="mc-skeleton" role="status" aria-label={text.loading}>
      <span className="mc-skeleton-hero" />
      <div>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <span className="mc-skeleton-shelf" />
    </div>
  );
}

export function MyCommitment() {
  const { id = "" } = useParams();
  const { locale, text } = useLocale();
  const snapshot = useSnapshot<ContributorProfile>(
    `/api/contributors/${encodeURIComponent(id)}`,
    true,
  );
  const profile = snapshot.data;
  const groups = useMemo(() => {
    const result = new Map<
      string,
      { definition: Definition; count: number; first: string; latest: string }
    >();
    for (const award of profile?.achievements ?? []) {
      const definition = profile?.achievementDefs.find(
        (d) => d.code === award.code,
      );
      if (!definition) continue;
      const old = result.get(award.code);
      if (old) {
        old.count++;
        old.first = old.first < award.earnedAt ? old.first : award.earnedAt;
        old.latest = old.latest > award.earnedAt ? old.latest : award.earnedAt;
      } else
        result.set(award.code, {
          definition,
          count: 1,
          first: award.earnedAt,
          latest: award.earnedAt,
        });
    }
    return result;
  }, [profile]);
  if (snapshot.error === 404) return <RecoveryPage />;
  const shelf = [...(profile?.achievementDefs ?? [])].sort((a, b) => {
    const x = groups.get(a.code),
      y = groups.get(b.code);
    return x && y ? x.first.localeCompare(y.first) : x ? -1 : y ? 1 : 0;
  });
  return (
    <main className="my-commitment" id="main-content" tabIndex={-1}>
      {snapshot.error && <RequestState snapshot={snapshot} />}
      {!profile && !snapshot.error && <Skeleton />}
      {profile && (
        <div className="mc-content" data-testid="contributor-impact">
          <section className="mc-identity" aria-labelledby="mc-name">
            <div className="mc-kicker">
              <span>{text.commitment_title}</span>
              <span className="mc-provenance">{text.demo_data}</span>
            </div>
            <div className="mc-card mc-hero">
              <div className="mc-person">
                <span
                  className="mc-avatar"
                  style={{ background: profile.avatarColor }}
                  aria-hidden="true"
                >
                  {profile.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </span>
                <div>
                  <div className="mc-name">
                    <h1 id="mc-name">{profile.name}</h1>
                    {profile.isCurrentUser && (
                      <span className="mc-self">{text.profile}</span>
                    )}
                  </div>
                  <p className="mc-handle">
                    {profile.handle.startsWith("@")
                      ? profile.handle
                      : `@${profile.handle}`}
                  </p>
                  <p className="mc-bio">{localize(profile.bio, locale)}</p>
                  <p className="mc-identity-note">
                    {text.contributor_impact_identity}
                  </p>
                </div>
              </div>
              <dl className="mc-hero-stats">
                <div>
                  <dd>
                    <Credits value={profile.walletBalance} />
                  </dd>
                  <dt>{text.wallet}</dt>
                </div>
                <div>
                  <dd>
                    <Credits value={profile.totalPledged} />
                  </dd>
                  <dt>{text.commitment_total}</dt>
                </div>
                <div>
                  <dd className="mc-reputation">
                    {profile.reputation.toLocaleString(locale)}
                  </dd>
                  <dt>{text.reputation}</dt>
                </div>
              </dl>
            </div>
          </section>
          <section aria-label={text.commitment_title}>
            <dl className="mc-stats">
              <div className="mc-card">
                <dd>
                  {profile.stats.missionsSupported.toLocaleString(locale)}
                </dd>
                <dt>{text.supported}</dt>
              </div>
              <div className="mc-card">
                <dd>{profile.stats.localReleases.toLocaleString(locale)}</dd>
                <dt>{text.releases_shipped}</dt>
              </div>
              <div className="mc-card">
                <dd>
                  <Credits value={profile.stats.creditsConsumed} />
                </dd>
                <dt>{text.commitment_consumed}</dt>
              </div>
              <div className="mc-card">
                <dd className="mc-refunded">
                  <Credits value={profile.stats.creditsRefunded} />
                </dd>
                <dt>{text.commitment_refunded}</dt>
              </div>
              <div className="mc-card">
                <dd
                  className="mc-adoption"
                  title={
                    profile.stats.downstreamDownloads === undefined
                      ? text.commitment_unknown
                      : undefined
                  }
                >
                  {profile.stats.downstreamDownloads === undefined
                    ? "—"
                    : new Intl.NumberFormat(locale, {
                        notation: "compact",
                      }).format(profile.stats.downstreamDownloads)}
                </dd>
                <dt>{text.commitment_downloads}</dt>
              </div>
            </dl>
            {profile.stats.accountingPartial && (
              <p className="mc-note">{text.commitment_partial}</p>
            )}
          </section>
          <section aria-labelledby="mc-badges">
            <h2 id="mc-badges">{text.commitment_badges}</h2>
            <ul className="mc-shelf" data-testid="commitment-badge-shelf">
              {shelf.map((def) => {
                const group = groups.get(def.code);
                return (
                  <li
                    key={def.code}
                    className={`mc-shelf-item ${group ? `is-earned tier-${def.tier}` : "is-locked"}`}
                    style={
                      {
                        "--mc-accent": `var(--${accents[def.code] ?? "funding"})`,
                      } as CSSProperties
                    }
                  >
                    <div className="mc-shelf-top">
                      <Badge definition={def} locked={!group} />
                      <span className="mc-earned-date">
                        {group ? (
                          <>
                            {text.commitment_earned}{" "}
                            <DateLabel value={group.first} />
                          </>
                        ) : (
                          text.commitment_locked
                        )}
                      </span>
                    </div>
                    <p>{localize(def.description, locale)}</p>
                  </li>
                );
              })}
            </ul>
          </section>
          <section aria-labelledby="mc-achievements">
            <h2 id="mc-achievements">{text.achievements}</h2>
            {!groups.size ? (
              <Empty icon={<Trophy size={28} />} />
            ) : (
              <div className="mc-achievements">
                {[...groups.values()]
                  .sort((a, b) => b.latest.localeCompare(a.latest))
                  .map((group) => {
                    const def = group.definition,
                      Icon = icons[def.icon as keyof typeof icons] ?? Trophy;
                    return (
                      <article
                        key={def.code}
                        className={`mc-card mc-achievement tier-${def.tier}`}
                        style={
                          {
                            "--mc-accent": `var(--${accents[def.code] ?? "funding"})`,
                          } as CSSProperties
                        }
                      >
                        <div className="mc-achievement-top">
                          <span className="mc-medallion">
                            <Icon size={21} />
                          </span>
                          <DateLabel relative value={group.latest} />
                        </div>
                        <h3>
                          {localize(def.name, locale)}
                          {group.count > 1 && (
                            <span className="mc-count">×{group.count}</span>
                          )}
                        </h3>
                        <p>{localize(def.description, locale)}</p>
                      </article>
                    );
                  })}
              </div>
            )}
          </section>
          <section aria-labelledby="mc-receipts">
            <div className="mc-section-title">
              <h2 id="mc-receipts">{text.receipts}</h2>
              <p>{text.commitment_receipts_note}</p>
            </div>
            {!profile.receipts.length ? (
              <Empty icon={<Receipt size={28} />} />
            ) : (
              <div className="mc-receipts">
                {profile.receipts.map((receipt) => {
                  const mission = profile.pledges.find(
                    (p) => p.missionId === receipt.missionId,
                  )?.mission;
                  return (
                    <article
                      className="mc-card mc-receipt"
                      key={receipt.missionId}
                    >
                      <Link
                        className="mc-mission-link"
                        to={`/missions/${encodeURIComponent(receipt.missionId)}`}
                      >
                        <strong>
                          {receipt.projectName ??
                            mission?.project.name ??
                            receipt.missionId}
                        </strong>
                        <span>
                          {localize(
                            receipt.missionTitle ??
                              mission?.title ??
                              receipt.missionId,
                            locale,
                          )}
                        </span>
                      </Link>
                      <div className="mc-chain">
                        <Stage tone="funding">
                          <Zap
                            size={12}
                            fill="currentColor"
                            aria-hidden="true"
                          />
                          {receipt.pledged.toLocaleString(locale)}{" "}
                          {text.commitment_pledged_stage}
                        </Stage>
                        <Arrow />
                        <Stage
                          {...(receipt.consumedShare !== undefined
                            ? { tone: "consumed" }
                            : {})}
                        >
                          {receipt.consumedShare !== undefined
                            ? `${receipt.consumedShare.toLocaleString(locale)} `
                            : ""}
                          {text.commitment_consumed_stage}
                        </Stage>
                        {receipt.refundedShare !== undefined &&
                          receipt.refundedShare > 0 && (
                            <>
                              <Arrow />
                              <Stage tone="verification">
                                {receipt.refundedShare.toLocaleString(locale)}{" "}
                                {text.commitment_refund_stage}
                              </Stage>
                            </>
                          )}
                        <Arrow />
                        <Stage
                          {...(receipt.artifactPrepared
                            ? { tone: "development" }
                            : {})}
                        >
                          <GitPullRequest size={12} aria-hidden="true" />
                          {receipt.artifactPrepared ? (
                            <Link
                              to={`/missions/${encodeURIComponent(receipt.missionId)}/review`}
                            >
                              {text.commitment_pr}
                            </Link>
                          ) : (
                            text.commitment_pr
                          )}
                        </Stage>
                        <Arrow />
                        <Stage
                          {...(receipt.status === "released"
                            ? { tone: "adoption" }
                            : {})}
                        >
                          {receipt.releaseVersion
                            ? `v${receipt.releaseVersion.replace(/^v/, "")}`
                            : text.commitment_release}
                          {receipt.releasedAt && (
                            <>
                              {" "}
                              · <DateLabel value={receipt.releasedAt} />
                            </>
                          )}
                        </Stage>
                        <Arrow />
                        <Stage
                          {...(receipt.adoption ? { tone: "adoption" } : {})}
                        >
                          {receipt.adoption ? (
                            <>
                              <Download size={12} aria-hidden="true" />
                              {new Intl.NumberFormat(locale, {
                                notation: "compact",
                              }).format(receipt.adoption.weeklyDownloads)}{" "}
                              <span>
                                {receipt.adoption.dataMode === "demo"
                                  ? text.demo_data
                                  : text.figures_live}
                              </span>
                            </>
                          ) : (
                            text.commitment_adoption
                          )}
                        </Stage>
                      </div>
                      {!!receipt.achievements?.length && (
                        <div className="mc-receipt-badges">
                          {receipt.achievements.map((code) => {
                            const def = profile.achievementDefs.find(
                              (d) => d.code === code,
                            );
                            return def ? (
                              <Badge key={code} definition={def} />
                            ) : null;
                          })}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          <section aria-labelledby="mc-pledges">
            <h2 id="mc-pledges">{text.pledges}</h2>
            {!profile.pledges.length ? (
              <Empty icon={<Zap size={28} />} />
            ) : (
              <div className="mc-card mc-table-wrap">
                <table>
                  <thead className="mc-sr-only">
                    <tr>
                      <th>{text.commitment_mission}</th>
                      <th>{text.commitment_status}</th>
                      <th>{text.commitment_amount}</th>
                      <th>{text.commitment_when}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.pledges.map((pledge) => (
                      <tr key={pledge.id}>
                        <td>
                          <Link
                            className="mc-mission-link"
                            to={`/missions/${encodeURIComponent(pledge.missionId)}`}
                          >
                            <strong>{pledge.mission.project.name}</strong>
                            <span>
                              {localize(pledge.mission.title, locale)}
                            </span>
                          </Link>
                        </td>
                        <td>
                          <Status status={pledge.mission.status} />
                        </td>
                        <td>
                          <Credits value={pledge.amount} />
                        </td>
                        <td>
                          <DateLabel relative value={pledge.createdAt} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
