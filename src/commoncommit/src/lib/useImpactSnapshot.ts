import { useCallback, useEffect, useRef, useState } from "react";
import type { DonorBeacon, ImpactStats } from "../../shared/types.js";
import { api } from "./api.js";
import { globalStreamUrl, useStream } from "./stream.js";

export type ImpactSnapshotState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; stats: ImpactStats; beacons: DonorBeacon[] };

const REVALIDATE_DELAY_MS = 160;

/**
 * One authoritative `/impact` snapshot for both the counters and the map.
 * Mission updates are debounced because one pledge can emit several frames;
 * reconnects revalidate so missed frames cannot leave the landing page stale.
 */
export function useImpactSnapshot() {
  const [state, setState] = useState<ImpactSnapshotState>({ status: "loading" });
  const requestId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connected = useRef(false);

  const load = useCallback(() => {
    const id = ++requestId.current;
    setState((current) => (current.status === "ready" ? current : { status: "loading" }));
    void api
      .impact()
      .then(({ stats, beacons }) => {
        if (requestId.current === id) setState({ status: "ready", stats, beacons });
      })
      .catch(() => {
        if (requestId.current === id) {
          // Keep an already-visible snapshot during a transient revalidation
          // failure. The explicit error UI is for an initial load with no data.
          setState((current) => (current.status === "ready" ? current : { status: "error" }));
        }
      });
  }, []);

  const scheduleLoad = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(load, REVALIDATE_DELAY_MS);
  }, [load]);

  useEffect(() => {
    load();
    return () => {
      requestId.current += 1;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  useStream(
    globalStreamUrl(),
    (message) => {
      if (message.kind === "mission_update") scheduleLoad();
    },
    () => {
      if (connected.current) scheduleLoad();
      else connected.current = true;
    }
  );

  return { state, retry: load };
}
