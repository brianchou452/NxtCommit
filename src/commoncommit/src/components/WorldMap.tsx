import { useId, useMemo, useState, type CSSProperties } from "react";
import { MapPin, Users, Zap } from "lucide-react";
import type { DonorBeacon } from "../../shared/types.js";
import { useI18n } from "../i18n/index.js";
import { fmtCompact, fmtInt } from "../lib/format.js";
import type { ImpactSnapshotState } from "../lib/useImpactSnapshot.js";
import { mapLocation } from "../lib/mapLocations.js";
import { beaconVisual } from "../lib/communityVisuals.js";
import {
  layoutMapLabels,
  projectLatitude,
  projectLongitude,
  WORLD_LAND_PATH,
  WORLD_MAP_HEIGHT,
  WORLD_MAP_WIDTH,
} from "../lib/worldMapGeometry.js";
import { DataModeBadge, Skeleton } from "./ui.js";

/** Graticule spacing in degrees. 30° keeps the mesh useful but quiet. */
const STEP = 30;
const LNG_LINES = Array.from({ length: 360 / STEP + 1 }, (_, i) => -180 + i * STEP);
const LAT_LINES = Array.from({ length: 180 / STEP + 1 }, (_, i) => -90 + i * STEP);

const beaconKey = (beacon: DonorBeacon, index: number) => `${beacon.contributorId}-${index}`;
const cityKey = (beacon: DonorBeacon) => `${beacon.city}|${beacon.country}`;

function WorldMapSkeleton() {
  const { t } = useI18n();
  return (
    <div className="cc-glass rounded-2xl p-4 sm:p-5" role="status">
      <span className="sr-only">{t("common.loading")}</span>
      <div className="mb-3 flex items-center gap-3" aria-hidden>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-28" />
        <Skeleton className="ml-auto h-6 w-20" />
      </div>
      <Skeleton className="mb-3 h-4 w-full max-w-xl" aria-hidden />
      <Skeleton className="aspect-[2/1] w-full rounded-xl" aria-hidden />
      <div className="mt-4 flex flex-wrap gap-2" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <Skeleton key={item} className="h-11 w-32 rounded-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * World view of seeded donor profile locations.
 *
 * The map and the counters receive one shared `/impact` snapshot from Home, so
 * their numbers cannot disagree. The coastline is accurate local geometry;
 * donor locations remain explicitly labelled demo data and are never inferred.
 */
export function WorldMap({ state, onRetry }: { state: ImpactSnapshotState; onRetry: () => void }) {
  const { t, locale } = useI18n();
  const uid = useId().replace(/:/g, "");
  const [pinned, setPinned] = useState<string | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const points = state.status === "ready" ? state.beacons : [];

  const cityCount = useMemo(() => new Set(points.map(cityKey)).size, [points]);
  const labelled = useMemo(() => {
    const seen = new Set<string>();
    return points.filter((beacon) => {
      const key = cityKey(beacon);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [points]);
  const labels = useMemo(
    () =>
      layoutMapLabels(
        labelled.map((beacon) => ({
          id: cityKey(beacon),
          label: mapLocation(beacon.city, beacon.country, t).city,
          x: projectLongitude(beacon.lng),
          y: projectLatitude(beacon.lat),
        }))
      ),
    [labelled, t]
  );
  const maxTokens = useMemo(() => Math.max(...points.map((beacon) => beacon.tokens), 1), [points]);
  const minTokens = useMemo(() => Math.min(...points.map((beacon) => beacon.tokens), maxTokens), [points, maxTokens]);
  const weeklyPool = useMemo(() => points.reduce((sum, beacon) => sum + beacon.tokens, 0), [points]);
  const activeKey = hot ?? pinned;
  const activeIndex = points.findIndex((beacon, index) => beaconKey(beacon, index) === activeKey);
  const activeBeacon = activeIndex >= 0 ? points[activeIndex] : null;

  if (state.status === "loading") return <WorldMapSkeleton />;
  if (state.status === "error") {
    return (
      <div role="alert" className="cc-glass rounded-2xl px-5 py-10 text-center">
        <p className="text-sm font-semibold text-danger">{t("map.error")}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex min-h-11 cursor-pointer items-center justify-center px-3 text-sm text-fund underline"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }
  if (points.length === 0) {
    return (
      <div className="cc-glass rounded-2xl px-5 py-10 text-center text-sm text-mut">
        {t("map.empty")}
      </div>
    );
  }

  const activeLocation = activeBeacon ? mapLocation(activeBeacon.city, activeBeacon.country, t) : null;

  return (
    <div className="cc-world-map cc-glass rounded-2xl p-4 sm:p-5">
      <section className="cc-map-pool" aria-label={t("map.pool.title")}>
        <div className="cc-map-pool-total">
          <span><Zap size={14} aria-hidden /> {t("map.pool.title")}</span>
          <strong>{fmtCompact(weeklyPool, locale)}</strong>
        </div>
        <div className="cc-map-pool-community">
          <div className="cc-map-pool-faces" aria-hidden>
            {points.slice(0, 5).map((beacon, index) => <i key={beaconKey(beacon, index)}>{beacon.handle.replace(/^@/, "").slice(0, 1).toUpperCase()}</i>)}
            {points.length > 5 && <i>+{points.length - 5}</i>}
          </div>
          <p><Users size={14} aria-hidden /> {t("map.pool.community", { backers: fmtInt(points.length, locale), cities: fmtInt(cityCount, locale) })}</p>
        </div>
      </section>
      <div className="cc-map-toolbar mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="inline-flex items-baseline gap-1.5 text-sm text-mut">
          <span className="font-mono text-base font-bold text-ink">{fmtInt(cityCount, locale)}</span>
          {t("map.cities")}
        </p>
        <div className="ml-auto flex max-w-full items-center gap-2">
          <label className="relative min-w-0">
            <span className="sr-only">{t("map.explore")}</span>
            <MapPin size={13} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-brand-text" aria-hidden />
            <select
              value={pinned ?? ""}
              onChange={(event) => setPinned(event.target.value || null)}
              className="min-h-10 max-w-[14rem] cursor-pointer appearance-none truncate rounded-full border border-line2 bg-bg1 py-2 pl-8 pr-8 text-xs font-semibold text-mut hover:border-brand2/50 hover:text-ink"
              aria-label={t("map.explore")}
            >
              <option value="">{t("map.choose")}</option>
              {points.map((beacon, index) => {
                const location = mapLocation(beacon.city, beacon.country, t);
                return <option key={beaconKey(beacon, index)} value={beaconKey(beacon, index)}>{location.city} · {beacon.handle}</option>;
              })}
            </select>
          </label>
          <DataModeBadge mode="demo" />
        </div>
      </div>
      <div className="cc-world-map-canvas relative overflow-hidden rounded-xl border border-line bg-bg0/70">
        <svg
          viewBox={`0 0 ${WORLD_MAP_WIDTH} ${WORLD_MAP_HEIGHT}`}
          className="block h-auto w-full"
          aria-hidden
          focusable="false"
          data-testid="donor-world-map"
        >
          <defs>
            <linearGradient
              id={`ccmap-${uid}`}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2={WORLD_MAP_WIDTH}
              y2="0"
            >
              <stop offset="0" stopColor="var(--color-grad-a)" />
              <stop offset="0.5" stopColor="var(--color-grad-b)" />
              <stop offset="1" stopColor="var(--color-grad-c)" />
            </linearGradient>
            <radialGradient id={`ccglow-${uid}`}>
              <stop offset="0" stopColor="var(--color-brand2)" stopOpacity="0.26" />
              <stop offset="1" stopColor="var(--color-brand2)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width={WORLD_MAP_WIDTH} height={WORLD_MAP_HEIGHT} fill={`url(#ccglow-${uid})`} />
          <path
            d={WORLD_LAND_PATH}
            data-map-layer="land"
            fill="var(--color-bg3)"
            stroke="var(--color-line2)"
            strokeWidth="1.15"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          <g stroke="var(--color-line2)" strokeWidth="1" opacity="0.34">
            {LNG_LINES.map((lng) => (
              <line
                key={`v${lng}`}
                x1={projectLongitude(lng)}
                y1="0"
                x2={projectLongitude(lng)}
                y2={WORLD_MAP_HEIGHT}
              />
            ))}
            {LAT_LINES.map((lat) => (
              <line
                key={`h${lat}`}
                x1="0"
                y1={projectLatitude(lat)}
                x2={WORLD_MAP_WIDTH}
                y2={projectLatitude(lat)}
              />
            ))}
          </g>
          <line
            x1="0"
            y1={projectLatitude(0)}
            x2={WORLD_MAP_WIDTH}
            y2={projectLatitude(0)}
            stroke="var(--color-line2)"
            strokeWidth="1.5"
            opacity="0.7"
          />

          {points.map((beacon, index) => {
            const key = beaconKey(beacon, index);
            const x = projectLongitude(beacon.lng);
            const y = projectLatitude(beacon.lat);
            const active = pinned === key || hot === key;
            const visual = beaconVisual(beacon.tokens, minTokens, maxTokens);
            const delay = `${(index % 7) * 0.34}s`;
            return (
              <g
                key={key}
                data-map-layer="beacon"
                data-token-tier={visual.rank > 0.72 ? "large" : visual.rank > 0.28 ? "medium" : "small"}
                onClick={() => setPinned(pinned === key ? null : key)}
                onMouseEnter={() => setHot(key)}
                onMouseLeave={() => setHot((current) => (current === key ? null : current))}
                className="cursor-pointer"
                style={{
                  "--cc-beacon-r": `${visual.core}px`,
                  "--cc-beacon-mobile-r": `${Math.max(12, visual.core * 2.6)}px`,
                } as CSSProperties}
              >
                <circle cx={x} cy={y} r={active ? visual.halo * 1.25 : visual.halo} fill={`url(#ccmap-${uid})`} opacity={active ? 0.48 : 0.2 + visual.rank * 0.13} />
                <circle
                  className="cc-beacon-ring"
                  data-active={active || undefined}
                  cx={x}
                  cy={y}
                  r={visual.core}
                  fill="none"
                  stroke={`url(#ccmap-${uid})`}
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  style={{ animationDelay: delay }}
                />
                <circle
                  className="cc-beacon"
                  data-active={active || undefined}
                  cx={x}
                  cy={y}
                  r={visual.core}
                  fill={`url(#ccmap-${uid})`}
                  stroke="var(--color-bg0)"
                  strokeWidth="1.25"
                  vectorEffect="non-scaling-stroke"
                  style={{ animationDelay: delay }}
                />
              </g>
            );
          })}

          {labels.map((label) => (
            <g key={label.id} className="hidden sm:inline" data-map-layer="label">
              <line
                x1={label.x}
                y1={label.y}
                x2={label.labelX}
                y2={label.labelY + 3}
                stroke="var(--color-line2)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={label.labelX}
                y={label.labelY}
                textAnchor={label.anchor}
                fill="var(--color-mut)"
                fontSize="14"
                fontWeight="650"
                paintOrder="stroke"
                stroke="var(--color-bg0)"
                strokeWidth="4"
                strokeLinejoin="round"
              >
                {label.label}
              </text>
            </g>
          ))}
        </svg>

        {activeBeacon && activeLocation && (
          <div
            className="pointer-events-none absolute z-10 max-w-[11rem] -translate-x-1/2 rounded-lg border border-line2 bg-bg1/95 px-2.5 py-2 text-center shadow-xl"
            style={{
              left: `${Math.max(13, Math.min(87, (projectLongitude(activeBeacon.lng) / WORLD_MAP_WIDTH) * 100))}%`,
              top: `${Math.max(24, Math.min(88, (projectLatitude(activeBeacon.lat) / WORLD_MAP_HEIGHT) * 100))}%`,
              transform: "translate(-50%, calc(-100% - 12px))",
            }}
            aria-hidden
          >
            <p className="truncate text-xs font-bold text-ink">{activeLocation.city}</p>
            <p className="truncate text-[11px] text-mut">{activeLocation.country} · {activeBeacon.handle}</p>
            <p className="mt-0.5 font-mono text-[11px] text-fund">
              {fmtCompact(activeBeacon.tokens, locale)} {t("map.beacon.tokens")}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
