export const CHROMATIC_NOTES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

export const SCALE_PRESETS = [
  { id: "major", category: "Modos griegos", name: "Mayor (Jónica)", intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: "dorian", category: "Modos griegos", name: "Dórica", intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: "phrygian", category: "Modos griegos", name: "Frigia", intervals: [0, 1, 3, 5, 7, 8, 10] },
  { id: "lydian", category: "Modos griegos", name: "Lidia", intervals: [0, 2, 4, 6, 7, 9, 11] },
  { id: "mixolydian", category: "Modos griegos", name: "Mixolidia", intervals: [0, 2, 4, 5, 7, 9, 10] },
  { id: "minor", category: "Modos griegos", name: "Menor natural (Eólica)", intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: "locrian", category: "Modos griegos", name: "Locria", intervals: [0, 1, 3, 5, 6, 8, 10] },
  { id: "major-pentatonic", category: "Pentatónicas", name: "Pentatónica mayor", intervals: [0, 2, 4, 7, 9] },
  { id: "minor-pentatonic", category: "Pentatónicas", name: "Pentatónica menor", intervals: [0, 3, 5, 7, 10] },
  { id: "blues", category: "Pentatónicas", name: "Blues", intervals: [0, 3, 5, 6, 7, 10] },
  { id: "harmonic-minor", category: "Menores", name: "Menor armónica", intervals: [0, 2, 3, 5, 7, 8, 11] },
  { id: "melodic-minor", category: "Menores", name: "Menor melódica", intervals: [0, 2, 3, 5, 7, 9, 11] },
  { id: "double-harmonic", category: "Medio Oriente", name: "Doble armónica (bizantina/árabe)", intervals: [0, 1, 4, 5, 7, 8, 11] },
  { id: "phrygian-dominant", category: "Medio Oriente", name: "Frigia dominante (Hijaz)", intervals: [0, 1, 4, 5, 7, 8, 10] },
  { id: "hungarian-minor", category: "Húngaras", name: "Húngara menor", intervals: [0, 2, 3, 6, 7, 8, 11] },
  { id: "hungarian-major", category: "Húngaras", name: "Húngara mayor", intervals: [0, 3, 4, 6, 7, 9, 10] },
  { id: "chinese-gong", category: "Modos chinos", name: "Gong", intervals: [0, 2, 4, 7, 9] },
  { id: "chinese-shang", category: "Modos chinos", name: "Shang", intervals: [0, 2, 5, 7, 10] },
  { id: "chinese-jue", category: "Modos chinos", name: "Jue", intervals: [0, 3, 5, 8, 10] },
  { id: "chinese-zhi", category: "Modos chinos", name: "Zhi", intervals: [0, 2, 5, 7, 9] },
  { id: "chinese-yu", category: "Modos chinos", name: "Yu", intervals: [0, 3, 5, 7, 10] },
  { id: "whole-tone", category: "Simétricas", name: "Tonos enteros", intervals: [0, 2, 4, 6, 8, 10] },
  { id: "octatonic", category: "Simétricas", name: "Octatónica (semitono-tono)", intervals: [0, 1, 3, 4, 6, 7, 9, 10] },
] as const;

export type ScalePresetId = (typeof SCALE_PRESETS)[number]["id"];

export const SCALE_HARMONY: Partial<Record<ScalePresetId, ScalePresetId>> = {
  "major-pentatonic": "major",
  "minor-pentatonic": "minor",
  blues: "minor",
  "hungarian-minor": "harmonic-minor",
  "hungarian-major": "mixolydian",
  "chinese-gong": "major",
  "chinese-shang": "dorian",
  "chinese-jue": "phrygian",
  "chinese-zhi": "mixolydian",
  "chinese-yu": "minor",
};

export const SCALE_CATEGORIES = [
  ...new Set(SCALE_PRESETS.map((preset) => preset.category)),
];

export const generateScaleNotes = (
  root: string,
  presetId: ScalePresetId,
): string[] => {
  const rootIndex = CHROMATIC_NOTES.indexOf(root as (typeof CHROMATIC_NOTES)[number]);
  const preset = SCALE_PRESETS.find((item) => item.id === presetId);
  if (rootIndex < 0 || !preset) return [];
  return preset.intervals.map(
    (interval) => CHROMATIC_NOTES[(rootIndex + interval) % 12],
  );
};
