import { analyzeProgression, type Key } from './progressionAnalyzer';
import { parseProgression } from './progressionParser';

export interface ProgressionState {
  input: string;
  selectedIndex: number;
  keyChoice: Pick<Key, 'tonic' | 'mode'> | null;
}
export const EMPTY_PROGRESSION: ProgressionState = { input: '', selectedIndex: 0, keyChoice: null };
export function deriveProgression(state: ProgressionState) {
  const parsed = parseProgression(state.input);
  const analysis = parsed.errors.length ? null : analyzeProgression(parsed.chords, state.keyChoice ?? undefined);
  const pendingKey = !!analysis && analysis.confidence === 'Baja' && !state.keyChoice;
  return {
    ...parsed, analysis, pendingKey,
    selectedChord: analysis ? parsed.chords[state.selectedIndex] ?? parsed.chords[0] : null,
    detectedScale: analysis && !pendingKey ? { root: analysis.key.root, preset: analysis.key.mode, notes: analysis.scaleNotes } : null,
  };
}
export function editProgression(input: string): ProgressionState {
  return { input, selectedIndex: 0, keyChoice: null };
}
export function appendProgression(state: ProgressionState, symbol: string): ProgressionState {
  const input = `${state.input.trim()} ${symbol}`.trim();
  return { input, selectedIndex: Math.max(0, parseProgression(input).chords.length - 1), keyChoice: null };
}
export function insertProgression(state: ProgressionState, symbol: string, insertIndex: number): ProgressionState {
  const { chords, errors } = parseProgression(state.input);
  const inserted = parseProgression(symbol);
  if (errors.length || inserted.errors.length || inserted.chords.length !== 1) return state;
  const index = Math.max(0, Math.min(chords.length, Math.trunc(insertIndex)));
  const next = [...chords.slice(0, index), inserted.chords[0], ...chords.slice(index)];
  return { input: next.map(chord => chord.name).join(' '), selectedIndex: index, keyChoice: state.keyChoice };
}
