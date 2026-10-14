import { useEffect, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { EMPTY_PROGRESSION, deriveProgression, editProgression, type ProgressionState } from '../utils/progressionState';

export function useProgression() {
  const queryInput = new URLSearchParams(window.location.search).get('progression');
  const [stored, setState] = useLocalStorage<ProgressionState>('progressionFinder_progression', EMPTY_PROGRESSION,
    queryInput !== null ? editProgression(queryInput) : undefined);
  const state = stored && typeof stored.input === 'string' ? stored : EMPTY_PROGRESSION;
  useEffect(() => {
    const url = new URL(window.location.href);
    if (state.input) url.searchParams.set('progression', state.input);
    else url.searchParams.delete('progression');
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [state.input]);
  const model = useMemo(() => deriveProgression(state), [state]);
  return { state, setState, ...model };
}
