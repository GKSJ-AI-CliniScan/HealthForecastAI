'use client';
/**
 * useData.ts — one hook for "load something, show loading, show error, retry".
 *
 * WHY: every screen needs the same 3 states. Writing them once means every
 * page behaves the same way, which is what makes an app feel simple to a
 * non-technical user (and testable for us).
 * USAGE: const q = useData(() => data.patients(), []);
 *        then <LoadState q={q}>{(rows) => …}</LoadState>  (ui.tsx)
 * FLOWS NEXT: LoadState in ui.tsx renders q.status.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DependencyList } from 'react';

import { ApiError } from '@/data';

type State<T> = { status: 'loading' } | { status: 'error'; error: ApiError } | { status: 'ok'; data: T };
export type Query<T> = State<T> & { reload: () => void };

export function useData<T>(load: () => Promise<T>, deps: DependencyList): Query<T> {
  const [state, setState] = useState<State<T>>({ status: 'loading' });
  const [tick, setTick] = useState(0); // bump to reload
  const loadRef = useRef(load);
  loadRef.current = load; // always call the latest closure without re-running the effect

  useEffect(() => {
    let alive = true; // ignore answers that arrive after the user left the page
    setState({ status: 'loading' });
    loadRef
      .current()
      .then((d) => alive && setState({ status: 'ok', data: d }))
      .catch((e: unknown) => {
        if (!alive) return;
        const err = e instanceof ApiError ? e : new ApiError('server', e instanceof Error ? e.message : 'Error');
        setState({ status: 'error', error: err });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { ...state, reload };
}
