import { parseChord, type ParsedChord } from './progressionParser';
import { SCALE_PRESETS } from './scalePresets';
import { spellScale, tonalRoot, spellPitch } from './noteSpelling';

export type Category = 'Acordes diatónicos' | 'Dominantes secundarios' | 'Acordes prestados o intercambio modal' | 'Sustituciones y acordes de enlace';
export interface Key { tonic: number; root: string; mode: 'major' | 'minor'; name: string; score: number }
export interface HarmonicChord { chord: ParsedChord; roman: string; diatonic: boolean; category: string; resolvesTo?: string; resolutionObserved?: boolean }
export interface Suggestion extends HarmonicChord { category: Category; reason: string }
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const SPANISH = ['Do', 'Re♭', 'Re', 'Mi♭', 'Mi', 'Fa', 'Fa♯', 'Sol', 'La♭', 'La', 'Si♭', 'Si'];
const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const mod = (n: number) => (n + 24) % 12;
function scale(key: Key) {
  return SCALE_PRESETS.find(p => p.id === key.mode)!.intervals.map(i => mod(key.tonic + i));
}
function diatonicChords(key: Key): ParsedChord[] {
  const pitches = scale(key);
  const names = getKeyScale(key);
  return pitches.map((root, i) => {
    const third = mod(pitches[(i + 2) % 7] - root);
    const fifth = mod(pitches[(i + 4) % 7] - root);
    return parseChord(names[i] + (third === 4 ? '' : fifth === 6 ? 'dim' : 'm'))!;
  });
}
function degreeRoman(chord: ParsedChord, degree: number) {
  const roman = chord.intervals[1] === 3 ? ROMANS[degree].toLowerCase() : ROMANS[degree];
  if (chord.type === 'suspended') return roman + chord.suffix;
  return roman + (chord.intervals[2] === 6 ? chord.suffix === 'm7b5' ? 'ø' : '°' : chord.intervals[2] === 8 ? '+' : '');
}
export function classifyChord(chord: ParsedChord, key: Key): HarmonicChord {
  const pitches = scale(key);
  const degree = pitches.indexOf(chord.pitchClass);
  const diatonic = chord.intervals.every(i => pitches.includes(mod(chord.pitchClass + i)));
  if (diatonic && degree >= 0) return { chord, roman: degreeRoman(chord, degree), diatonic, category: 'Acordes diatónicos' };
  if (chord.suffix === 'dim7') {
    const leadingTarget = diatonicChords(key).find(c => c.pitchClass === mod(chord.pitchClass + 1) && c.type !== 'diminished');
    if (leadingTarget) {
      const targetDegree = pitches.indexOf(leadingTarget.pitchClass);
      return { chord, roman: targetDegree === 0 ? 'vii°7' : `vii°7/${degreeRoman(leadingTarget, targetDegree)}`, diatonic: false,
        category: 'Sustituciones y acordes de enlace', resolvesTo: leadingTarget.name };
    }
  }
  const target = diatonicChords(key).find(c => c.pitchClass === mod(chord.pitchClass + 5) && c.type !== 'diminished');
  if (chord.intervals[1] === 4 && chord.intervals[2] === 7 && target && (chord.intervals.length === 3 || chord.suffix === '7')) {
    const targetDegree = pitches.indexOf(target.pitchClass);
    return { chord, roman: targetDegree === 0 ? 'V' : `V${chord.suffix === '7' ? '7' : ''}/${degreeRoman(target, targetDegree)}`, diatonic: false,
      category: targetDegree === 0 ? 'Dominante de la tonalidad menor' : 'Dominantes secundarios', resolvesTo: target.name };
  }
  const parallel = scale({ ...key, mode: key.mode === 'major' ? 'minor' : 'major' });
  const borrowed = chord.intervals.every(i => parallel.includes(mod(chord.pitchClass + i)));
  const relative = mod(chord.pitchClass - key.tonic);
  const major = [0, 2, 4, 5, 7, 9, 11];
  const nearest = major.findIndex(i => i === relative || mod(i - 1) === relative);
  const index = degree >= 0 ? degree : nearest >= 0 ? nearest : major.findIndex(i => mod(i + 1) === relative);
  const accidental = degree >= 0 ? '' : major[index] === mod(relative + 1) ? '♭' : '♯';
  return { chord, roman: accidental + degreeRoman(chord, Math.max(0, index)), diatonic: false,
    category: borrowed ? 'Acordes prestados o intercambio modal' : 'Acorde cromático' };
}
function scoreKey(chords: ParsedChord[], key: Key) {
  const harmony = chords.map(c => classifyChord(c, key));
  let score = 0;
  harmony.forEach((h, i) => {
    const weight = 1 + (i === 0 ? 0.35 : 0) + (i === chords.length - 1 ? 0.5 : 0);
    score += weight * (h.diatonic ? 3 : h.resolvesTo ? 1.8 : h.category === 'Acordes prestados o intercambio modal' ? 0.5 : -2);
    if (h.chord.pitchClass === key.tonic && h.chord.intervals[1] === (key.mode === 'major' ? 4 : 3)) score += 1.5 * weight;
    const next = harmony[i + 1];
    if (next && h.chord.pitchClass === mod(key.tonic + 7) && h.chord.intervals[1] === 4 && next.roman === (key.mode === 'major' ? 'I' : 'i')) {
      score += 5;
      if (i > 0 && harmony[i - 1].roman.startsWith('ii')) score += 3;
    }
    if (h.resolvesTo && next?.chord.pitchClass === parseChord(h.resolvesTo)?.pitchClass) score += 1;
  });
  return score;
}
export function getKeyScale(key: Key): string[] {
  return spellScale(key.root, SCALE_PRESETS.find(p => p.id === key.mode)!.intervals);
}
export function analyzeProgression(chords: ParsedChord[], selectedKey?: Pick<Key, 'tonic' | 'mode'>) {
  if (!chords.length) return null;
  const candidates: Key[] = [];
  for (let tonic = 0; tonic < 12; tonic++) for (const mode of ['major', 'minor'] as const) {
    const root = tonalRoot(tonic, mode, chords.map(c => c.root));
    const naturalNames: Record<string, string> = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
    const displayRoot = root === NAMES[tonic] ? SPANISH[tonic] : naturalNames[root[0]] + root.slice(1).replaceAll('#', '♯').replaceAll('b', '♭');
    const key: Key = { tonic, root, mode, name: `${displayRoot} ${mode === 'major' ? 'mayor' : 'menor'}`, score: 0 };
    key.score = scoreKey(chords, key);
    candidates.push(key);
  }
  candidates.sort((a, b) => b.score - a.score || a.tonic - b.tonic || a.mode.localeCompare(b.mode));
  const key = candidates.find(c => c.tonic === selectedKey?.tonic && c.mode === selectedKey?.mode) ?? candidates[0];
  const gap = candidates[0].score - candidates[1].score;
  const confidence = chords.length < 3 || gap < 2 ? 'Baja' : gap < 5 ? 'Media' : 'Alta';
  const harmony = chords.map((chord, i) => {
    const h = classifyChord(chord, key);
    const next = chords[i + 1];
    if (chord.type === 'suspended' && next?.pitchClass === chord.pitchClass && [3, 4].includes(next.intervals[1])) {
      return { ...h, resolvesTo: next.name, resolutionObserved: true,
        suspensionResolution: chord.notes[1] + (chord.suffix === 'sus2' ? ' asciende hacia ' : ' desciende hacia ') + next.notes[1] };
    }
    return { ...h, suspensionResolution: undefined, resolutionObserved: !!h.resolvesTo && chords[(i + 1) % chords.length].pitchClass === parseChord(h.resolvesTo)?.pitchClass };
  });
  const diatonic = diatonicChords(key);
  const suggestions: Suggestion[] = [];
  const add = (chord: ParsedChord, category: Category, reason: string, resolvesTo?: string) => {
    const h = classifyChord(chord, key);
    suggestions.push({ ...h, category, reason, resolvesTo: resolvesTo ?? h.resolvesTo });
  };
  diatonic.forEach((c, i) => add(c, 'Acordes diatónicos', i === 0 ? 'Estabiliza el centro tonal.' : 'Amplía la progresión con notas de la escala.', i === 4 ? diatonic[0].name : undefined));
  diatonic.forEach((target, i) => {
    if (i > 0 && target.type !== 'diminished') add(parseChord(target.fifth + '7')!, 'Dominantes secundarios', `Aumenta la tensión antes de ${target.name}.`, target.name);
  });
  diatonicChords({ ...key, mode: key.mode === 'major' ? 'minor' : 'major' }).filter(c => !classifyChord(c, key).diatonic).forEach(c => add(c, 'Acordes prestados o intercambio modal', 'Aporta el color del modo paralelo.', diatonic[0].name));
  add(parseChord(spellPitch(mod(key.tonic + 1), diatonic[1].root[0]) + '7')!, 'Sustituciones y acordes de enlace', 'Sustitución por tritono del dominante: descenso cromático hacia la tónica.', diatonic[0].name);
  add(parseChord(spellPitch(mod(key.tonic + 11), diatonic[6].root[0]) + 'dim7')!, 'Sustituciones y acordes de enlace', 'La sensible disminuida enlaza por semitono con la tónica.', diatonic[0].name);
  const dominant = parseChord(diatonic[4].root + '7')!;
  const alternatives = [[diatonic[1], dominant, diatonic[0]], [diatonic[0], diatonic[5], diatonic[3], dominant], [diatonic[0], diatonic[3], dominant, diatonic[0]]];
  const explanation = `La lectura ${selectedKey ? 'elegida' : 'más probable'} es ${key.name}: ${harmony.map(h => h.roman).join(' – ')}. ` + harmony.filter(h => h.resolvesTo).map(h => h.suspensionResolution ? `${h.chord.name} → ${h.resolvesTo} es una resolución de suspensión: ${h.suspensionResolution}.` : `${h.chord.name} ${h.chord.suffix === 'dim7' ? 'es la sensible disminuida' : h.roman === 'V' ? 'es el dominante' : 'es un dominante secundario'} de ${h.resolvesTo}${h.resolutionObserved ? '; su resolución aparece en la progresión o al repetirla' : '; esa resolución es posible, pero no aparece inmediatamente'}.`).join(' ') + ' Los números romanos indican el grado y la calidad básica; las séptimas se conservan en los símbolos.';
  return { key, confidence, alternativesKeys: candidates.filter(c => c !== key).slice(0, 3), candidates, harmony, suggestions, alternatives, explanation, scaleNotes: getKeyScale(key) };
}
export type ProgressionAnalysis = NonNullable<ReturnType<typeof analyzeProgression>>;
