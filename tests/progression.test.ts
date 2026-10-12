import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChord, parseProgression } from '../src/utils/progressionParser';
import { analyzeProgression } from '../src/utils/progressionAnalyzer';
import { generateScaleNotes } from '../src/utils/scalePresets';
import { pitchClass } from '../src/utils/noteSpelling';
import { appendProgression, deriveProgression, editProgression } from '../src/utils/progressionState';
import { getGuitarPositions, getGuitarVoicing } from '../src/utils/guitarChords';

test('parser supports all requested qualities and accidentals', () => {
  for (const symbol of ['C', 'Cm', 'C7', 'Cmaj7', 'Cm7', 'Cm7b5', 'Cdim', 'Caug', 'F#m7', 'Bbmaj7', 'Cb', 'B#', 'E♭m']) assert.ok(parseChord(symbol), symbol);
  assert.equal(parseChord('F#')?.pitchClass, parseChord('Gb')?.pitchClass);
  assert.equal(parseChord('Cb')?.pitchClass, 11);
  assert.deepEqual(parseChord('Cm7b5')?.intervals, [0, 3, 6, 10]);
  assert.equal(parseChord('Caug')?.type, 'augmented');
  assert.equal(parseChord('Cdim')?.type, 'diminished');
  assert.deepEqual(parseProgression('Gm,C-Fmaj7 D7').chords.map(c => c.name), ['Gm', 'C', 'Fmaj7', 'D7']);
});
test('empty and invalid input remain safe', () => {
  assert.deepEqual(parseProgression('  , - '), { chords: [], errors: [] });
  assert.equal(analyzeProgression([]), null);
  assert.equal(parseProgression('H Cwat C#b Cmaj9').errors.length, 4);
  assert.equal(parseProgression('C H').chords.length, 1);
});
test('F major with a secondary dominant returning to ii', () => {
  const result = analyzeProgression(parseProgression('Gm C Fmaj7 D7').chords)!;
  assert.equal(result.key.name, 'Fa mayor');
  assert.deepEqual(result.harmony.map(h => h.roman), ['ii', 'V', 'I', 'V7/ii']);
  assert.equal(result.harmony[3].diatonic, false);
  assert.equal(result.harmony[3].resolvesTo, 'Gm');
  assert.equal(result.harmony[3].resolutionObserved, true);
  assert.equal(result.candidates.length, 24);
});
test('ii–V–I establishes C major', () => {
  const result = analyzeProgression(parseProgression('Dm G Cmaj7').chords)!;
  assert.equal(result.key.name, 'Do mayor');
  assert.deepEqual(result.harmony.map(h => h.roman), ['ii', 'V', 'I']);
});
test('minor dominant with raised leading tone establishes A minor', () => {
  const result = analyzeProgression(parseProgression('Am Dm E7 Am').chords)!;
  assert.equal(result.key.name, 'La menor');
  assert.deepEqual(result.harmony.map(h => h.roman), ['i', 'iv', 'V', 'i']);
  assert.equal(result.harmony[2].resolvesTo, 'Am');
});
test('sharp and flat ii–V–I progressions', () => {
  for (const [input, tonic] of [['G#m C# F#maj7', 6], ['Cm F Bbmaj7', 10]] as const) {
    const result = analyzeProgression(parseProgression(input).chords)!;
    assert.equal(result.key.tonic, tonic);
    assert.deepEqual(result.harmony.map(h => h.roman), ['ii', 'V', 'I']);
  }
});
test('ambiguous progressions expose uncertainty and alternatives', () => {
  const result = analyzeProgression(parseProgression('C Am').chords)!;
  assert.equal(result.confidence, 'Baja');
  assert.equal(result.alternativesKeys.length, 3);
  assert.ok([result.key, ...result.alternativesKeys].some(key => key.name === 'La menor'));
  assert.ok([result.key, ...result.alternativesKeys].some(key => key.name === 'Do mayor'));
});
test('modal borrowing and suggestions remain usable', () => {
  const result = analyzeProgression(parseProgression('C F Fm G7 C').chords)!;
  assert.equal(result.key.name, 'Do mayor');
  assert.equal(result.harmony[2].category, 'Acordes prestados o intercambio modal');
  assert.equal(new Set(result.suggestions.map(s => s.category)).size, 4);
  for (const suggestion of result.suggestions) assert.ok(parseChord(suggestion.chord.name));
  for (const alternative of result.alternatives) assert.ok(alternative.length >= 3);
});

test('F major drives the scale and preserves D7 as a chromatic chord', () => {
  const model = deriveProgression({ ...editProgression('Gm C Fmaj7 D7'), selectedIndex: 3 });
  assert.deepEqual(model.detectedScale, { root: 'F', preset: 'major', notes: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'] });
  assert.deepEqual(model.chords.map(c => c.name), ['Gm', 'C', 'Fmaj7', 'D7']);
  assert.equal(model.selectedChord?.name, 'D7');
  assert.deepEqual(model.selectedChord?.notes, ['D', 'F#', 'A', 'C']);
  assert.ok(!model.detectedScale!.notes.includes('F#'));
  const positions = getGuitarPositions('D', '7', true);
  assert.ok(positions.length > 0);
  for (const position of positions) assert.deepEqual([...new Set(getGuitarVoicing(position).map(pitchClass))].sort((a, b) => a - b), [0, 2, 6, 9]);
  assert.deepEqual(generateScaleNotes('F', 'major'), model.detectedScale!.notes);
});
test('key signatures retain letter names and correct accidentals', () => {
  assert.deepEqual(generateScaleNotes('Bb', 'major'), ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A']);
  assert.deepEqual(generateScaleNotes('Db', 'major'), ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C']);
  assert.deepEqual(generateScaleNotes('F#', 'major'), ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']);
  assert.deepEqual(generateScaleNotes('A', 'minor'), ['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  assert.deepEqual(parseChord('Bbmaj7')?.notes, ['Bb', 'D', 'F', 'A']);
  assert.deepEqual(parseChord('F#m')?.notes, ['F#', 'A', 'C#']);
  assert.deepEqual(parseChord('Caug')?.notes, ['C', 'E', 'G#']);
  assert.deepEqual(parseChord('Cm7b5')?.notes, ['C', 'Eb', 'Gb', 'Bb']);
  assert.deepEqual(parseChord('G#7')?.notes, ['G#', 'B#', 'D#', 'F#']);
});
test('adding selects the appended chord and explicit replacement starts at the first chord', () => {
  const initial = editProgression('Gm C Fmaj7 D7');
  const next = appendProgression(initial, 'Bbmaj7');
  assert.equal(next.input, 'Gm C Fmaj7 D7 Bbmaj7');
  assert.equal(next.selectedIndex, 4);
  assert.equal(deriveProgression(next).selectedChord?.name, 'Bbmaj7');
  assert.equal(editProgression('Dm G Cmaj7').selectedIndex, 0);
  assert.equal(initial.input, 'Gm C Fmaj7 D7');
});
test('low confidence waits for a choice; edits invalidate the previous choice', () => {
  const initial = editProgression('C Am');
  const model = deriveProgression(initial);
  assert.equal(model.pendingKey, true);
  assert.equal(model.detectedScale, null);
  const chosen = deriveProgression({ ...initial, keyChoice: { tonic: 0, mode: 'major' } });
  assert.equal(chosen.pendingKey, false);
  assert.equal(chosen.detectedScale?.root, 'C');
  assert.equal(chosen.analysis?.key.name, 'Do mayor');
  assert.equal(editProgression('C Am F').keyChoice, null);
  assert.deepEqual(deriveProgression(initial), model);
});
test('persistence restores progression and selection without changing the source', () => {
  const state = { ...editProgression('Gm C Fmaj7 D7'), selectedIndex: 3 };
  const restored = deriveProgression(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.selectedChord?.name, 'D7');
  assert.equal(restored.detectedScale?.root, 'F');
  for (const input of ['', 'H', 'C H']) {
    const model = deriveProgression(editProgression(input));
    assert.equal(model.analysis, null);
    assert.equal(model.detectedScale, null);
  }
});
test('minor spelling and all generated suggestions remain parseable', () => {
  for (const input of ['Am Dm E7 Am', 'C#m F#m G#7 C#m', 'G#m C#m D#7 G#m', 'Bbm Ebm F7 Bbm', 'Ebm Abm Bb7 Ebm']) {
    const result = analyzeProgression(parseProgression(input).chords)!;
    for (const s of result.suggestions) assert.ok(parseChord(s.chord.name), s.chord.name);
    assert.equal(new Set(result.scaleNotes.map(n => n[0])).size, 7);
  }
  assert.deepEqual(deriveProgression(editProgression('Am Dm E7 Am')).detectedScale?.notes, ['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  assert.ok(getGuitarPositions('C', 'm7b5', true).length > 0);
});


test('suspended chords preserve spelling, quality, guitar tones and playback', async () => {
  const { detectChordFormula } = await import('../src/utils/chordDetector');
  const { getVoicedNotesForChord } = await import('../src/utils/chordPlayback');
  const cases: [string, string[]][] = [
    ['Csus', ['C', 'F', 'G']], ['Csus4', ['C', 'F', 'G']],
    ['Csus2', ['C', 'D', 'G']], ['C7sus4', ['C', 'F', 'G', 'Bb']],
    ['F#sus4', ['F#', 'B', 'C#']], ['Bbsus2', ['Bb', 'C', 'F']],
  ];
  for (const [symbol, notes] of cases) {
    const chord = parseChord(symbol)!;
    assert.deepEqual(chord.notes, notes, symbol);
    assert.equal(chord.type, 'suspended');
    assert.equal(detectChordFormula(chord.intervals.slice(1)).quality, 'suspended');
    assert.equal(chord.name, symbol === 'Csus' ? 'Csus4' : symbol);
    const expected = [...new Set(notes.map(pitchClass))].sort((a,b) => a-b);
    for (const octave of [2, 3, 4]) assert.deepEqual(getVoicedNotesForChord(chord, octave).map(pitchClass).sort((a,b)=>a-b), expected);
    const positions = getGuitarPositions(chord.root, symbol === 'Csus' ? 'sus' : chord.suffix, !!chord.isSeventhChord);
    assert.ok(positions.length > 0, symbol);
    for (const position of positions) assert.deepEqual([...new Set(getGuitarVoicing(position).map(pitchClass))].sort((a,b)=>a-b), expected, symbol);
  }
  for (const root of ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']) {
    for (const suffix of ['sus2','sus4','7sus4']) {
      const chord = parseChord(root + suffix)!;
      const positions = getGuitarPositions(root,suffix,!!chord.isSeventhChord);
      assert.ok(positions.length >= 3);
      for (const position of positions) assert.deepEqual([...new Set(getGuitarVoicing(position).map(pitchClass))].sort((a,b)=>a-b), chord.notes.map(pitchClass).sort((a,b)=>a-b));
    }
  }
});

test('suspension resolves in F major without losing the key', () => {
  const result = analyzeProgression(parseProgression('Gm Csus4 C Fmaj7 D7').chords)!;
  assert.equal(result.key.name, 'Fa mayor');
  assert.deepEqual(result.harmony.map(h=>h.roman), ['ii','Vsus4','V','I','V7/ii']);
  assert.equal(result.harmony[1].resolutionObserved, true);
  assert.equal(result.harmony[1].resolvesTo, 'C');
  assert.match(result.explanation, /F desciende hacia E/);
  const seventh = analyzeProgression(parseProgression('Gm C7sus4 C Fmaj7 D7').chords)!;
  assert.equal(seventh.key.name, 'Fa mayor');
  assert.equal(seventh.harmony[1].roman, 'V7sus4');
  const model = deriveProgression({...editProgression('Gm Csus4 C Fmaj7 D7'), selectedIndex: 1});
  assert.deepEqual(model.selectedChord?.notes, ['C','F','G']);
  assert.equal(model.detectedScale?.root, 'F');
});
