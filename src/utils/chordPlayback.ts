import type { ChordInfo } from './chordTypes';
import { pitchClass } from './noteSpelling';
import { CHROMATIC_NOTES } from './scalePresets';

export function getVoicedNotesForChord(chord: ChordInfo, baseOctave: number): string[] {
  let octave = baseOctave;
  let previous = -1;
  return chord.notes.map(note => {
    const pitch = pitchClass(note);
    if (pitch <= previous) octave++;
    previous = pitch;
    return CHROMATIC_NOTES[pitch] + octave;
  });
}
