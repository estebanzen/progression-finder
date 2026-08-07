export type ChordQuality =
  | 'major'
  | 'minor'
  | 'diminished'
  | 'dominant'
  | 'halfdiminished'
  | 'augmented'
  | 'minor-major'
  | 'augmented-major'
  | 'suspended'
  | 'unknown';

export interface ChordFormula {
  intervals: readonly number[];
  suffix: string;
  quality: ChordQuality;
  label: string;
}

const CHORD_FORMULAS: readonly ChordFormula[] = [
  { intervals: [4, 7], suffix: '', quality: 'major', label: 'major' },
  { intervals: [3, 7], suffix: 'm', quality: 'minor', label: 'minor' },
  { intervals: [3, 6], suffix: 'dim', quality: 'diminished', label: 'diminished' },
  { intervals: [4, 8], suffix: 'aug', quality: 'augmented', label: 'augmented' },
  { intervals: [2, 7], suffix: 'sus2', quality: 'suspended', label: 'sus2' },
  { intervals: [5, 7], suffix: 'sus4', quality: 'suspended', label: 'sus4' },

  { intervals: [4, 7, 11], suffix: 'maj7', quality: 'major', label: 'major 7' },
  { intervals: [4, 7, 10], suffix: '7', quality: 'dominant', label: 'dominant 7' },
  { intervals: [3, 7, 10], suffix: 'm7', quality: 'minor', label: 'minor 7' },
  { intervals: [3, 7, 11], suffix: 'minj7', quality: 'minor-major', label: 'minor major 7' },
  { intervals: [4, 8, 11], suffix: 'maj7#5', quality: 'augmented-major', label: 'augmented major 7' },
  { intervals: [3, 6, 10], suffix: 'min7/b5', quality: 'halfdiminished', label: 'half-diminished 7' },
  { intervals: [3, 6, 9], suffix: 'dim7', quality: 'diminished', label: 'diminished 7' },
];

const sameIntervals = (left: readonly number[], right: readonly number[]) =>
  left.length === right.length && left.every((interval, index) => interval === right[index]);

export const detectChordFormula = (intervals: readonly number[]): ChordFormula =>
  CHORD_FORMULAS.find((formula) => sameIntervals(formula.intervals, intervals)) ?? {
    intervals,
    suffix: '?',
    quality: 'unknown',
    label: 'other',
  };
