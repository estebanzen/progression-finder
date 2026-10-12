import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProgression } from '../src/utils/progressionParser';
import { analyzeProgression } from '../src/utils/progressionAnalyzer';
import { getContextualChordSuggestions, getContextualProgressionVariants, voiceLeadingDistance } from '../src/utils/contextualChordSuggestions';
import { deriveProgression, editProgression, insertProgression } from '../src/utils/progressionState';
import { getGuitarPositions, getGuitarVoicing } from '../src/utils/guitarChords';
import { pitchClass } from '../src/utils/noteSpelling';

const progression = parseProgression('Gm C Fmaj7 D7').chords;
const analysis = analyzeProgression(progression)!;
const suggestions = getContextualChordSuggestions(progression, analysis);
test('contextual suggestions exclude existing harmony and rank concrete diatonic expansions', () => {
  assert.equal(analysis.key.name, 'Fa mayor');
  for (const symbol of ['Gm', 'C', 'Fmaj7', 'D7', 'Gm7', 'C7']) assert.ok(!suggestions.some(s => s.chord.name === symbol));
  for (const symbol of ['Bbmaj7', 'Dm7', 'Am7']) {
    const suggestion = suggestions.find(s => s.chord.name === symbol)!;
    assert.ok(suggestion.score >= 82, `${symbol}: ${suggestion.score}`);
    assert.ok(suggestions.slice(0, 6).includes(suggestion), symbol);
    assert.equal(suggestion.insertIndex, 3);
    assert.equal(suggestion.category, 'Acordes diatónicos');
  }
  assert.equal(suggestions.find(s => s.chord.name === 'Bbmaj7')?.romanNumeral, 'IVmaj7');
  assert.equal(suggestions.find(s => s.chord.name === 'Am7')?.romanNumeral, 'iii7');
  assert.equal(suggestions.find(s => s.chord.name === 'Dm7')?.romanNumeral, 'vi7');
  assert.deepEqual(suggestions.map(s => s.score), suggestions.map(s => s.score).sort((a, b) => b - a));
});
test('borrowing, leading tones and secondary dominants have clear destinations', () => {
  const borrowed = suggestions.find(s => s.chord.name === 'Bbm7')!;
  assert.equal(borrowed.category, 'Acordes prestados o intercambio modal');
  assert.equal(borrowed.resolvesTo, 'Fmaj7');
  assert.equal(borrowed.insertIndex, 2);
  assert.equal(borrowed.resolutionPresent, true);
  const leading = suggestions.find(s => s.chord.name === 'F#dim7')!;
  assert.equal(leading.category, 'Sustituciones y acordes de enlace');
  assert.equal(leading.resolvesTo, 'Gm');
  assert.equal(leading.confidence, 'Muy compatible');
  assert.ok([0, 4].includes(leading.insertIndex));
  assert.ok(leading.locations.some(location => location.insertIndex === 0));
  assert.ok(leading.locations.some(location => location.insertIndex === 4));
  const dominant = suggestions.find(s => s.chord.name === 'G7')!;
  assert.equal(dominant.romanNumeral, 'V7/V');
  assert.equal(dominant.insertIndex, 1);
  assert.equal(dominant.resolutionPresent, true);
  for (const name of ['A7', 'E7', 'F7']) {
    const unresolved = suggestions.find(s => s.chord.name === name)!;
    assert.equal(unresolved.resolutionPresent, false);
    assert.equal(unresolved.confidence, 'Experimental');
    assert.match(unresolved.reason, /todavía no está/);
  }
  assert.ok(suggestions.find(s => s.chord.name === 'Dbmaj7')!.score < borrowed.score);
  assert.ok(suggestions.some(s => s.chord.name === 'Ebmaj7'));
  assert.ok(suggestions.some(s => s.chord.name === 'Em7b5'));
  assert.ok(suggestions.some(s => s.chord.name === 'C#dim7'));
});
test('every recommendation produces an actual insertion and preserves the source', () => {
  const source = editProgression('Gm C Fmaj7 D7');
  for (const suggestion of suggestions) {
    assert.ok(suggestion.insertIndex >= 0 && suggestion.insertIndex <= progression.length);
    assert.ok(suggestion.reason.length > 20);
    assert.equal(suggestion.resultingProgression[suggestion.insertIndex].name, suggestion.chord.name);
    const inserted = insertProgression(source, suggestion.chord.name, suggestion.insertIndex);
    assert.equal(inserted.selectedIndex, suggestion.insertIndex);
    assert.deepEqual(parseProgression(inserted.input).chords.map(c => c.name), suggestion.resultingProgression.map(c => c.name));
  }
  assert.equal(source.input, 'Gm C Fmaj7 D7');
  const suggestion = suggestions.find(s => s.chord.name === 'Bbmaj7')!;
  const inserted = deriveProgression(insertProgression(source, suggestion.chord.name, suggestion.insertIndex));
  assert.equal(inserted.selectedChord?.name, 'Bbmaj7');
  assert.equal(inserted.detectedScale?.root, 'F');
  for (const name of ['Bbmaj7', 'Am7', 'Dm7', 'Bbm7', 'F#dim7', 'G7']) {
    const suggestion = suggestions.find(s => s.chord.name === name)!;
    const result = deriveProgression(insertProgression(source, name, suggestion.insertIndex));
    assert.equal(result.detectedScale?.root, 'F', name);
  }
  const linked = deriveProgression(insertProgression(source, 'F#dim7', 4));
  const last = linked.analysis!.harmony.at(-1)!;
  assert.equal(last.roman, 'vii°7/ii');
  assert.equal(last.resolvesTo, 'Gm');
  assert.equal(last.resolutionObserved, true);
  assert.match(linked.analysis!.explanation, /sensible disminuida/);
});
test('proposed variants retain the original sequence and use resolved secondary dominants', () => {
  const variants = getContextualProgressionVariants(progression, analysis);
  assert.equal(variants.length, 5);
  assert.ok(variants.some(v => v.chords.map(c => c.name).join(' ') === 'Gm7 C7 Fmaj7 Am7 D7'));
  assert.ok(variants.some(v => v.chords.map(c => c.name).join(' ') === 'Gm7 C7 Fmaj7 A7 Dm7 D7'));
  assert.ok(variants.some(v => v.chords.map(c => c.name).join(' ') === 'F#dim7 Gm7 C7 Fmaj7 D7'));
  assert.ok(variants.some(v => v.character === 'Soul'));
  for (const variant of variants) {
    let index = 0;
    for (const chord of variant.chords) if (chord.pitchClass === progression[index]?.pitchClass && chord.intervals[1] === progression[index]?.intervals[1]) index++;
    assert.equal(index, progression.length);
  }
});
test('diminished and half-diminished guitar positions include all chord tones', () => {
  for (const symbol of ['F#dim7', 'C#dim7', 'Em7b5']) {
    const chord = parseProgression(symbol).chords[0];
    const expected = [...new Set(chord.notes.map(pitchClass))].sort((a, b) => a - b);
    const positions = getGuitarPositions(chord.root, chord.suffix, true);
    assert.ok(positions.length > 0);
    for (const position of positions) assert.deepEqual([...new Set(getGuitarVoicing(position).map(pitchClass))].sort((a, b) => a - b), expected);
  }
  assert.equal(voiceLeadingDistance(progression[0], progression[0]), 0);
});
test('contextual recommendations are deterministic and adapt to transposed neighbors', () => {
  assert.deepEqual(getContextualChordSuggestions(progression, analysis), suggestions);
  for (const input of ['Dm G Cmaj7 A7', 'Am Dm E7 Am', 'G#m C#m D#7 G#m']) {
    const chords = parseProgression(input).chords;
    const result = analyzeProgression(chords)!;
    const generated = getContextualChordSuggestions(chords, result);
    assert.ok(generated.length >= 6);
    for (const suggestion of generated) assert.equal(suggestion.resultingProgression.length, chords.length + 1);
  }
});
