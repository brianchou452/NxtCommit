import { useCallback, useEffect, useRef, useState } from 'react';
import type { BootstrapSnapshot } from '../../shared/types.js';
import { fetchBootstrap, resetDemo } from '../services/api.js';

export type SessionState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: BootstrapSnapshot };
/** Nonvisual shell state; approved application-shell rendering is a separate gate. */
export function useApplicationSession() {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const [resetState, setResetState] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const request = useRef<AbortController | undefined>(undefined);
  const resetting = useRef(false);
  const mounted = useRef(false);
  const reload = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState({ status: 'loading' });
    try {
      const data = await fetchBootstrap(controller.signal);
      if (mounted.current && !controller.signal.aborted) setState({ status: 'ready', data });
    } catch {
      if (mounted.current && !controller.signal.aborted) setState({ status: 'error' });
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void reload();
    return () => { mounted.current = false; request.current?.abort(); };
  }, [reload]);
  async function reset(): Promise<boolean> {
    if (resetting.current) return false;
    resetting.current = true;
    setResetState('pending');
    try {
      await resetDemo();
      if (!mounted.current) return false;
      setResetState('done');
      await reload();
      return true;
    } catch {
      if (mounted.current) setResetState('error');
      return false;
    } finally { resetting.current = false; }
  }
  return { state, reload, reset, resetState };
}
