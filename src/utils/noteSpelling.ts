const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURALS = [0, 2, 4, 5, 7, 9, 11];
export const pitchClass = (note: string): number => {
  const match = /^([A-Ga-g])([#b]*)/.exec(note);
  if (!match) return -1;
  const natural = NATURALS[LETTERS.indexOf(match[1].toUpperCase())];
  const offset = [...match[2]].reduce((sum, sign) => sum + (sign === '#' ? 1 : -1), 0);
  return (natural + offset + 24) % 12;
};
export function spellPitch(pitch: number, letter: string): string {
  const offset = ((pitch - NATURALS[LETTERS.indexOf(letter)] + 18) % 12) - 6;
  return letter + (offset > 0 ? '#'.repeat(offset) : 'b'.repeat(-offset));
}
export function spellScale(root: string, intervals: readonly number[]): string[] {
  const tonic = pitchClass(root);
  if (tonic < 0) return [];
  const start = LETTERS.indexOf(root[0].toUpperCase());
  return intervals.map((interval, degree) => spellPitch((tonic + interval) % 12, LETTERS[(start + degree) % 7]));
}
export function spellChordNotes(root: string, intervals: readonly number[]): string[] {
  const start = LETTERS.indexOf(root[0].toUpperCase());
  return intervals.map((interval, degree) => degree === 0 ? root : spellPitch((pitchClass(root) + interval) % 12, LETTERS[(start + (degree === 1 && interval === 2 ? 1 : degree === 1 && interval === 5 ? 3 : degree * 2)) % 7]));
}
const MAJOR_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
// Prefer conventional signatures; explicit input spelling breaks equal-signature ties.
export function tonalRoot(tonic: number, mode: 'major' | 'minor', inputRoots: string[] = []): string {
  if (tonic === 6 && mode === 'major' && inputRoots.includes('Gb') && !inputRoots.includes('F#')) return 'Gb';
  if (tonic === 3 && mode === 'minor' && inputRoots.includes('D#') && !inputRoots.includes('Eb')) return 'D#';
  return (mode === 'major' ? MAJOR_ROOTS : MINOR_ROOTS)[tonic];
}
