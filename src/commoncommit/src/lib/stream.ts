import { event as adaptEvent } from "./nxtAdapter.js";
import { useEffect, useRef } from "react";
import type { StreamMessage } from "../../shared/types.js";

/**
 * SSE subscription with automatic reconnect. On (re)connect the caller's
 * `onConnect` runs — use it to refetch a REST snapshot so missed events
 * never leave the UI stale.
 */
export function useStream(
  url: string | null,
  onMessage: (msg: StreamMessage) => void,
  onConnect?: () => void
): void {
  const handlers = useRef({ onMessage, onConnect });
  handlers.current = { onMessage, onConnect };

  useEffect(() => {
    if (!url) return;
    let source: EventSource | null = null;
    let closed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (closed) return;
      source = new EventSource(url);
      source.onopen = () => handlers.current.onConnect?.();
      const receive = (e: MessageEvent) => {
        try {
          const value = JSON.parse(e.data);
          const msg = (value.kind ? value : e.type === "mission_update" ? {kind:e.type,mission:value} : e.type === "run_update" ? {kind:e.type,run:value} : value) as StreamMessage;
          if (msg.kind === "exec_event") msg.event = adaptEvent(msg.event) as typeof msg.event;
          if (msg.kind !== "heartbeat") handlers.current.onMessage(msg);
        } catch {
          // ignore malformed frames
        }
      };
      source.onmessage = receive;
      for (const kind of ["mission_update", "run_update", "exec_event", "achievement"]) source.addEventListener(kind, receive);
      source.onerror = () => {
        source?.close();
        if (!closed) retryTimer = setTimeout(connect, 1500);
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retryTimer);
      source?.close();
    };
  }, [url]);
}

export const missionStreamUrl = (missionId: string) => `/api/missions/${missionId}/stream`;
export const globalStreamUrl = () => `/api/stream`;
