import { detectChordFormula } from './chordDetector';
import { CHROMATIC_NOTES } from './scalePresets';
import type { ChordInfo } from './chordTypes';
import { pitchClass as getPitchClass, spellChordNotes } from './noteSpelling';

const FORMULAS: Record<string, number[]> = {
  '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], m7b5: [0, 3, 6, 10],
  sus: [0, 5, 7], sus4: [0, 5, 7], sus2: [0, 2, 7], '7sus4': [0, 5, 7, 10],
  dim: [0, 3, 6], aug: [0, 4, 8], dim7: [0, 3, 6, 9],
};
export interface ParsedChord extends ChordInfo { pitchClass: number; intervals: number[] }
export function parseChord(symbol: string): ParsedChord | null {
  const match = /^([A-Ga-g])(#{1,2}|b{1,2})?(7sus4|sus4|sus2|sus|maj7|m7b5|m7|dim7|dim|aug|m|7)?$/.exec(symbol.trim().replaceAll('♯', '#').replaceAll('♭', 'b'));
  if (!match) return null;
  const root = match[1].toUpperCase() + (match[2] ?? '');
  const suffix = match[3] === 'sus' ? 'sus4' : match[3] ?? '';
  const pitchClass = getPitchClass(root);
  const intervals = FORMULAS[suffix];
  const notes = spellChordNotes(root, intervals);
  return { root, suffix, name: root + suffix, pitchClass, intervals,
    type: detectChordFormula(intervals.slice(1)).quality, notes,
    third: notes[1], fifth: notes[2], seventh: notes[3], isSeventhChord: notes.length === 4,
    voicedNotes: intervals.map(interval => `${CHROMATIC_NOTES[(pitchClass + interval) % 12]}${3 + Math.floor((pitchClass + interval) / 12)}`),
  };
}
export function parseProgression(input: string): { chords: ParsedChord[]; errors: string[] } {
  const chords: ParsedChord[] = [];
  const errors: string[] = [];
  for (const token of input.trim().split(/[\s,\-–—]+/).filter(Boolean)) {
    const chord = parseChord(token);
    if (chord) chords.push(chord);
    else errors.push(`Símbolo inválido: ${token}`);
  }
  return { chords, errors };
}
