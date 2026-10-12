import type { ChordQuality } from './chordDetector';
export interface ChordInfo {
  root: string;
  /** Second chord tone; a second or fourth for suspended chords. */
  third: string;
  fifth: string;
  seventh?: string;
  type: ChordQuality;
  suffix: string;
  name: string;
  notes: string[];
  voicedNotes: string[];
  isSeventhChord?: boolean;
}
