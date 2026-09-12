import { useCallback, useEffect, useRef, useState } from "react";
export class ApiError extends Error {
  constructor(readonly status: number) {
    super("request_failed");
  }
}
export async function getJSON<T>(
  url: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, signal ? { signal } : {});
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<T>;
}
export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<T>;
}
export interface Snapshot<T> {
  data: T | undefined;
  loading: boolean;
  error: number | undefined;
  reload: () => void;
}
export function useSnapshot<T>(url: string, stream = false): Snapshot<T> {
  const [state, setState] = useState<{
    url: string;
    data: T | undefined;
    loading: boolean;
    error: number | undefined;
  }>({ url, data: undefined, loading: true, error: undefined });
  const sequence = useRef(0);
  const controller = useRef<AbortController | undefined>(undefined);
  const reload = useCallback(() => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const version = ++sequence.current;
    setState((old) => ({ ...old, loading: true, error: undefined }));
    void getJSON<T>(url, abort.signal)
      .then((data) => {
        if (sequence.current === version && !abort.signal.aborted)
          setState({ url, data, loading: false, error: undefined });
      })
      .catch((error) => {
        if (!abort.signal.aborted && sequence.current === version)
          setState((old) => ({
            ...old,
            loading: false,
            error: error instanceof ApiError ? error.status : 500,
          }));
      });
  }, [url]);
  useEffect(() => {
    setState({ url, data: undefined, loading: true, error: undefined });
    reload();
    const unsubscribe = stream ? subscribeSnapshots(reload) : () => {};
    return () => {
      unsubscribe();
      controller.current?.abort();
      sequence.current++;
    };
  }, [reload, stream]);
  return state.url === url ? { ...state, reload } : { data: undefined, loading: true, error: undefined, reload };
}
const subscribers = new Set<() => void>();
let source: EventSource | undefined;
let reconnect: ReturnType<typeof setTimeout> | undefined;
function connect() {
  if (!subscribers.size) return;
  source = new EventSource("/api/stream");
  source.onopen = () => subscribers.forEach((fn) => fn());
  source.addEventListener("mission_update", () =>
    subscribers.forEach((fn) => fn()),
  );
  source.onerror = () => {
    source?.close();
    source = undefined;
    clearTimeout(reconnect);
    reconnect = setTimeout(connect, 1500);
  };
}
export function subscribeSnapshots(callback: () => void) {
  subscribers.add(callback);
  if (subscribers.size === 1) connect();
  return () => {
    subscribers.delete(callback);
    if (!subscribers.size) {
      source?.close();
      source = undefined;
      clearTimeout(reconnect);
    }
  };
}
