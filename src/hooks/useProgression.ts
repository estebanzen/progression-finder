import { useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { EMPTY_PROGRESSION, deriveProgression, type ProgressionState } from '../utils/progressionState';

export function useProgression() {
  const [stored, setState] = useLocalStorage<ProgressionState>('progressionFinder_progression', EMPTY_PROGRESSION);
  const state = stored && typeof stored.input === 'string' ? stored : EMPTY_PROGRESSION;
  const model = useMemo(() => deriveProgression(state), [state]);
  return { state, setState, ...model };
}
