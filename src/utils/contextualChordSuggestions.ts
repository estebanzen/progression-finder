import { classifyChord, type Category, type ProgressionAnalysis } from './progressionAnalyzer';
import { parseChord, type ParsedChord } from './progressionParser';
import { pitchClass, spellPitch } from './noteSpelling';

export interface InsertionLocation {
  insertIndex: number;
  label: string;
  score: number;
  reason: string;
  resultingProgression: ParsedChord[];
  resolutionPresent: boolean;
}
export interface ContextualChordSuggestion extends InsertionLocation {
  chord: ParsedChord;
  notes: string[];
  category: Category;
  romanNumeral: string;
  confidence: 'Muy compatible' | 'Compatible' | 'Experimental';
  resolvesTo: string | null;
  locations: InsertionLocation[];
}
export interface ProposedProgression {
  chords: ParsedChord[];
  character: 'Jazz' | 'Soul' | 'Tensión' | 'Suave' | 'Experimental';
  explanation: string;
}
export function compatibilityLevel(score: number): ContextualChordSuggestion['confidence'] {
  return score >= 82 ? 'Muy compatible' : score >= 60 ? 'Compatible' : 'Experimental';
}
interface Candidate {
  chord: ParsedChord;
  category: Category;
  roman: string;
  base: number;
  reason: string;
  target?: ParsedChord;
  functional?: boolean;
}
const mod = (pitch: number) => (pitch + 24) % 12;
const DIATONIC: Category = 'Acordes diatónicos';
const SECONDARY: Category = 'Dominantes secundarios';
const BORROWED: Category = 'Acordes prestados o intercambio modal';
const PASSING: Category = 'Sustituciones y acordes de enlace';
const chordPitches = (chord: ParsedChord) => chord.intervals.map(i => mod(chord.pitchClass + i));
const distance = (a: number, b: number) => Math.min(mod(a - b), mod(b - a));
// Symmetric nearest-note distance is a pitch-class heuristic, not a fixed voicing.
export function voiceLeadingDistance(a: ParsedChord, b: ParsedChord): number {
  const left = chordPitches(a), right = chordPitches(b);
  const directed = (from: number[], to: number[]) => from.reduce((sum, note) => sum + Math.min(...to.map(other => distance(note, other))), 0) / from.length;
  return (directed(left, right) + directed(right, left)) / 2;
}
function sameHarmony(candidate: ParsedChord, existing: ParsedChord) {
  return candidate.pitchClass === existing.pitchClass && candidate.intervals.slice(0, 3).every((interval, i) => interval === existing.intervals[i]) &&
    (existing.intervals.length === 3 || candidate.type === existing.type);
}
export function getDiatonicSevenths(analysis: ProgressionAnalysis): ParsedChord[] {
  const notes = analysis.scaleNotes;
  const pitches = notes.map(pitchClass);
  return notes.map((root, degree) => {
    const third = mod(pitches[(degree + 2) % 7] - pitches[degree]);
    const fifth = mod(pitches[(degree + 4) % 7] - pitches[degree]);
    const seventh = mod(pitches[(degree + 6) % 7] - pitches[degree]);
    const suffix = fifth === 6 ? 'm7b5' : third === 3 ? 'm7' : seventh === 11 ? 'maj7' : '7';
    return parseChord(root + suffix)!;
  });
}
function extendedRoman(chord: ParsedChord, analysis: ProgressionAnalysis) {
  const roman = classifyChord(chord, analysis.key).roman;
  if (roman.includes('/')) return roman;
  return roman.replace('°', chord.suffix === 'm7b5' ? 'ø' : '°') + (chord.suffix === 'maj7' ? 'maj7' : chord.isSeventhChord ? '7' : '');
}
export function insertionLabel(progression: ParsedChord[], index: number): string {
  if (index === 0) return `Antes de ${progression[0].name} (cierre ${progression.at(-1)!.name} → ${progression[0].name})`;
  if (index === progression.length) return `Después de ${progression.at(-1)!.name} (al repetir, antes de ${progression[0].name})`;
  return `Entre ${progression[index - 1].name} y ${progression[index].name}`;
}
export function getContextualChordSuggestions(progression: ParsedChord[], analysis: ProgressionAnalysis): ContextualChordSuggestion[] {
  if (!progression.length) return [];
  const diatonic = getDiatonicSevenths(analysis);
  const tonic = diatonic[0];
  const candidates: Candidate[] = [];
  diatonic.forEach((chord, degree) => candidates.push({
    chord, category: DIATONIC, roman: extendedRoman(chord, analysis), base: degree === 6 ? 48 : degree === 3 || degree === 5 ? 65 : 57,
    reason: degree === 3 ? 'Expande la tónica con el color del cuarto grado.' : degree === 5 ? 'Introduce el relativo y conserva el carácter de la tonalidad.' : 'Conserva las notas de la escala y amplía la conexión entre los acordes vecinos.',
    target: degree === 6 ? tonic : undefined,
  }));
  diatonic.forEach((target, degree) => {
    if (degree === 0 || target.type === 'halfdiminished') return;
    const chord = parseChord(target.fifth + '7')!;
    candidates.push({ chord, category: SECONDARY, roman: classifyChord(chord, analysis.key).roman, base: 49,
      reason: `Es el dominante secundario de ${target.name}: aumenta la tensión para dirigir la llegada a ese acorde.`, target, functional: true });
  });
  if (analysis.key.mode === 'major') {
    const rootAt = (degree: number, interval: number) => spellPitch(mod(analysis.key.tonic + interval), analysis.scaleNotes[degree][0]);
    candidates.push({ chord: parseChord(rootAt(3, 5) + 'm7')!, category: BORROWED, roman: 'iv menor prestado', base: 52,
      reason: 'El cuarto grado menor viene del modo paralelo y acerca sus voces por semitono a la tónica.', target: tonic, functional: true });
    candidates.push({ chord: parseChord(rootAt(6, 10) + 'maj7')!, category: BORROWED, roman: '♭VIImaj7', base: 42,
      reason: 'Toma el séptimo grado rebajado del modo mixolidio y ofrece un regreso suave, de color soul, a la tónica.', target: tonic });
    candidates.push({ chord: parseChord(rootAt(5, 8) + 'maj7')!, category: BORROWED, roman: '♭VImaj7', base: 27,
      reason: 'El sexto grado rebajado del modo menor paralelo introduce un desvío más intenso antes de retomar la tonalidad.' });
  } else {
    const ivMajor = parseChord(diatonic[3].root + '7')!;
    candidates.push({ chord: ivMajor, category: BORROWED, roman: 'IV7 prestado', base: 43,
      reason: 'El cuarto grado mayor aporta el color dórico a la tonalidad menor.', target: tonic });
  }
  diatonic.forEach((target, degree) => {
    if (target.type === 'halfdiminished') return;
    const leading = spellPitch(mod(target.pitchClass - 1), analysis.scaleNotes[(degree + 6) % 7][0]);
    const chord = parseChord(leading + 'dim7')!;
    const targetRoman = classifyChord(target, analysis.key).roman;
    candidates.push({ chord, category: PASSING, roman: degree === 0 ? 'vii°7' : `vii°7/${targetRoman}`, base: 48,
      reason: `${chord.name} es la sensible ${degree === 0 ? '' : 'secundaria '}de ${target.name}; su raíz sube un semitono y resuelve la tensión disminuida.`, target, functional: true });
  });

  const scalePitches = new Set(analysis.scaleNotes.map(pitchClass));
  const results: ContextualChordSuggestion[] = [];
  for (const candidate of candidates) {
    if (progression.some(existing => sameHarmony(candidate.chord, existing))) continue;
    const locations: InsertionLocation[] = [];
    for (let insertIndex = 0; insertIndex <= progression.length; insertIndex++) {
      const before = progression[(insertIndex - 1 + progression.length) % progression.length];
      const after = progression[insertIndex % progression.length];
      const resolutionPresent = !!candidate.target && candidate.target.pitchClass === after.pitchClass && candidate.target.intervals[1] === after.intervals[1];
      const chromaticNotes = chordPitches(candidate.chord).filter(note => !scalePitches.has(note)).length;
      const proximity = Math.max(0, 13 - 3 * (voiceLeadingDistance(before, candidate.chord) + voiceLeadingDistance(candidate.chord, after)) / 2);
      let score = candidate.base + proximity - chromaticNotes * 1.5;
      if (resolutionPresent) score += candidate.functional ? 23 : 12;
      else if (candidate.functional) score -= 20;
      else if (candidate.target) score -= 5;
      if (candidate.category === DIATONIC && before.pitchClass === tonic.pitchClass) score += 12;
      if (candidate.category === DIATONIC && after.type === 'dominant') score += 4;
      const existingResolution = before.intervals[1] === 4 && mod(before.pitchClass + 5) === after.pitchClass;
      if (existingResolution && !resolutionPresent && candidate.category !== DIATONIC) score -= 10;
      if (existingResolution && before.type === 'dominant' && candidate.category === PASSING && resolutionPresent && (insertIndex === 0 || insertIndex === progression.length)) score += 12;
      if (before.type === 'dominant' && after.pitchClass === tonic.pitchClass && !resolutionPresent) score -= 8;
      score = Math.round(Math.max(0, Math.min(100, score)));
      const common = candidate.chord.notes.filter(note => chordPitches(before).includes(pitchClass(note)));
      let reason = `${candidate.reason} ${insertionLabel(progression, insertIndex)}.`;
      if (common.length) reason += ` Comparte ${common.join(', ')} con ${before.name}, lo que suaviza el enlace.`;
      if (candidate.target) reason += resolutionPresent
        ? ` La resolución aparece inmediatamente hacia ${after.name}${insertIndex === progression.length ? ' al repetir la progresión' : ''}.`
        : ` Para completar la resolución, añadí luego ${candidate.target.name}; esa llegada todavía no está en esta ubicación.`;
      const resultingProgression = [...progression.slice(0, insertIndex), candidate.chord, ...progression.slice(insertIndex)];
      locations.push({ insertIndex, label: insertionLabel(progression, insertIndex), score, reason, resultingProgression, resolutionPresent });
    }
    locations.sort((a, b) => b.score - a.score || a.insertIndex - b.insertIndex);
    const best = locations[0];
    // Offer nearby alternatives, but keep unsupported functional resolutions out of high-priority choices.
    const compatibleLocations = locations.filter(location => location.score >= best.score - 9 && (!candidate.functional || location.resolutionPresent === best.resolutionPresent));
    results.push({ ...best, chord: candidate.chord, notes: candidate.chord.notes, category: candidate.category, romanNumeral: candidate.roman,
      confidence: compatibilityLevel(best.score),
      resolvesTo: best.resolutionPresent ? progression[best.insertIndex % progression.length].name : candidate.target?.name ?? null, locations: compatibleLocations });
  }
  const unique = new Map<string, ContextualChordSuggestion>();
  for (const suggestion of results) {
    const existing = unique.get(suggestion.chord.name);
    if (!existing || suggestion.score > existing.score) unique.set(suggestion.chord.name, suggestion);
  }
  return [...unique.values()].sort((a, b) => b.score - a.score || a.chord.name.localeCompare(b.chord.name));
}

export function getContextualProgressionVariants(progression: ParsedChord[], analysis: ProgressionAnalysis): ProposedProgression[] {
  if (!progression.length) return [];
  const diatonic = getDiatonicSevenths(analysis);
  const enriched = progression.map(chord => chord.isSeventhChord ? chord : parseChord(chord.root + (chord.type === 'minor' ? 'm7' : chord.type === 'major' ? chord.pitchClass === mod(analysis.key.tonic + 7) ? '7' : 'maj7' : chord.type === 'diminished' ? 'm7b5' : 'aug'))!);
  const tonicIndex = progression.findIndex(chord => chord.pitchClass === analysis.key.tonic);
  const expansionIndex = tonicIndex >= 0 ? tonicIndex + 1 : Math.max(1, progression.length - 1);
  const insert = (index: number, chords: ParsedChord[]) => [...enriched.slice(0, index), ...chords, ...enriched.slice(index)];
  const variants: ProposedProgression[] = [];
  variants.push({ chords: insert(expansionIndex, [diatonic[2]]), character: 'Jazz', explanation: `Extiende las tríadas a séptimas y suma ${diatonic[2].name} para conectar la tónica con el tramo final.` });
  if (analysis.key.mode === 'major' && tonicIndex >= 0) {
    const borrowed = parseChord(diatonic[3].root + 'm7')!;
    variants.push({ chords: insert(expansionIndex, [diatonic[3], borrowed, enriched[tonicIndex]]), character: 'Soul', explanation: `${diatonic[3].name} pasa a ${borrowed.name} y vuelve a ${enriched[tonicIndex].name}: expansión y regreso con intercambio modal.` });
  }
  const relative = diatonic[5];
  variants.push({ chords: insert(expansionIndex, [parseChord(relative.fifth + '7')!, relative]), character: 'Suave', explanation: `Agrega un dominante secundario con su resolución explícita en ${relative.name}, conservando los acordes originales.` });
  const first = progression[0];
  const targetDegree = analysis.scaleNotes.findIndex(note => pitchClass(note) === first.pitchClass);
  if (targetDegree >= 0 && first.intervals[2] === 7) {
    const leading = spellPitch(mod(first.pitchClass - 1), analysis.scaleNotes[(targetDegree + 6) % 7][0]);
    variants.push({ chords: insert(0, [parseChord(leading + 'dim7')!]), character: 'Tensión', explanation: `Prepara ${enriched[0].name} con su sensible disminuida y refuerza el cierre circular hacia el primer acorde.` });
  }
  const targetIndex = progression.findIndex(chord => chord.pitchClass === mod(analysis.key.tonic + 7));
  const secondaryIndex = targetIndex >= 0 ? targetIndex : 0;
  const target = enriched[secondaryIndex];
  variants.push({ chords: insert(secondaryIndex, [parseChord(target.fifth + '7')!]), character: 'Tensión', explanation: `Prepara ${target.name} con su dominante secundario sin quitar ningún acorde de la progresión original.` });
  return variants.filter((variant, index, all) => all.findIndex(other => other.chords.map(c => c.name).join(' ') === variant.chords.map(c => c.name).join(' ')) === index).slice(0, 5);
}
