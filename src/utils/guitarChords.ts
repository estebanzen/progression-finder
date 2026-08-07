export type FretValue = number | 'X';

export interface ChordPosition {
  frets: FretValue[]; // 6 strings, low E to high E
  baseFret: number;
}

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OPEN_STRINGS_MIDI = [40, 45, 50, 55, 59, 64]; // E2, A2, D3, G3, B3, E4

export const midiToNote = (midi: number): string => {
  const octave = Math.floor(midi / 12) - 1;
  const pc = PITCH_CLASSES[midi % 12];
  return `${pc}${octave}`;
};

export const getGuitarVoicing = (pos: ChordPosition): string[] => {
  const notes: string[] = [];
  pos.frets.forEach((fret, stringIdx) => {
    if (fret !== 'X') {
      const midi = OPEN_STRINGS_MIDI[stringIdx] + (fret as number);
      notes.push(midiToNote(midi));
    }
  });
  return notes;
};

export const noteToSemitone = (note: string): number => {
  const match = note.match(/^([A-G])(#|b)?/);
  if (!match) return 0;
  let idx = PITCH_CLASSES.indexOf(match[1]);
  if (match[2] === '#') idx += 1;
  else if (match[2] === 'b') idx -= 1;
  return (idx + 12) % 12;
};

export const transposeNote = (note: string, semitones: number): string => {
  const match = note.match(/^([A-G])(#|b)?(.*)$/);
  if (!match) return note;
  const semitone = noteToSemitone(match[1] + (match[2] || ''));
  const newSemitone = (semitone + semitones + 12) % 12;
  return PITCH_CLASSES[newSemitone] + (match[3] || '');
};

// Root strings: 0=E, 1=A, 2=D, 3=G, 4=B, 5=e
interface ShapeDef {
  frets: FretValue[];
  rootString: number;
  shapeRootSemitone: number; // e.g. E=4, A=9, D=2, C=0, G=7
}

const SHAPES: Record<string, ShapeDef[]> = {
  'major': [
    { frets: [0, 2, 2, 1, 0, 0], rootString: 0, shapeRootSemitone: 4 }, // E shape
    { frets: ['X', 0, 2, 2, 2, 0], rootString: 1, shapeRootSemitone: 9 }, // A shape
    { frets: ['X', 'X', 0, 2, 3, 2], rootString: 2, shapeRootSemitone: 2 }, // D shape
    { frets: ['X', 3, 2, 0, 1, 0], rootString: 1, shapeRootSemitone: 0 }, // C shape
    { frets: [3, 2, 0, 0, 0, 3], rootString: 0, shapeRootSemitone: 7 }, // G shape
  ],
  'minor': [
    { frets: [0, 2, 2, 0, 0, 0], rootString: 0, shapeRootSemitone: 4 }, // Em shape
    { frets: ['X', 0, 2, 2, 1, 0], rootString: 1, shapeRootSemitone: 9 }, // Am shape
    { frets: ['X', 'X', 0, 2, 3, 1], rootString: 2, shapeRootSemitone: 2 }, // Dm shape
    { frets: ['X', 3, 1, 0, 1, 'X'], rootString: 1, shapeRootSemitone: 0 }, // Cm shape
  ],
  'maj7': [
    { frets: [0, 'X', 1, 1, 0, 'X'], rootString: 0, shapeRootSemitone: 4 }, // Emaj7
    { frets: ['X', 0, 2, 1, 2, 0], rootString: 1, shapeRootSemitone: 9 }, // Amaj7
    { frets: ['X', 'X', 0, 2, 2, 2], rootString: 2, shapeRootSemitone: 2 }, // Dmaj7
    { frets: ['X', 3, 2, 0, 0, 0], rootString: 1, shapeRootSemitone: 0 }, // Cmaj7
  ],
  'm7': [
    { frets: [0, 2, 0, 0, 0, 0], rootString: 0, shapeRootSemitone: 4 }, // Em7
    { frets: ['X', 0, 2, 0, 1, 0], rootString: 1, shapeRootSemitone: 9 }, // Am7
    { frets: ['X', 'X', 0, 2, 1, 1], rootString: 2, shapeRootSemitone: 2 }, // Dm7
  ],
  'minj7': [
    { frets: [0, 2, 1, 0, 0, 0], rootString: 0, shapeRootSemitone: 4 },
    { frets: ['X', 0, 2, 1, 1, 0], rootString: 1, shapeRootSemitone: 9 }
  ],
  'maj7#5': [
    { frets: [0, 'X', 1, 1, 1, 0], rootString: 0, shapeRootSemitone: 4 },
    { frets: ['X', 3, 2, 1, 0, 0], rootString: 1, shapeRootSemitone: 0 }
  ],
  '7': [
    { frets: [0, 2, 0, 1, 0, 0], rootString: 0, shapeRootSemitone: 4 }, // E7
    { frets: ['X', 0, 2, 0, 2, 0], rootString: 1, shapeRootSemitone: 9 }, // A7
    { frets: ['X', 'X', 0, 2, 1, 2], rootString: 2, shapeRootSemitone: 2 }, // D7
    { frets: ['X', 3, 2, 3, 1, 0], rootString: 1, shapeRootSemitone: 0 }, // C7
    { frets: [3, 2, 0, 0, 0, 1], rootString: 0, shapeRootSemitone: 7 }, // G7
  ],
  'm7b5': [
    { frets: [0, 1, 0, 0, 'X', 'X'], rootString: 0, shapeRootSemitone: 4 }, // Em7b5 (simplified, actually 0,1,0,0,3,0 but we'll use a standard barre shape later)
    { frets: ['X', 0, 1, 0, 1, 'X'], rootString: 1, shapeRootSemitone: 9 }, // Am7b5
    { frets: ['X', 'X', 0, 1, 1, 1], rootString: 2, shapeRootSemitone: 2 }, // Dm7b5
  ],
  'dim7': [
    { frets: [0, 'X', 2, 0, 2, 0], rootString: 0, shapeRootSemitone: 4 }, // Edim7
    { frets: ['X', 0, 1, 2, 1, 2], rootString: 1, shapeRootSemitone: 9 }, // Adim7
    { frets: ['X', 'X', 0, 1, 0, 1], rootString: 2, shapeRootSemitone: 2 }, // Ddim7
  ],
  'diminished': [
    { frets: [0, 1, 2, 0, 'X', 'X'], rootString: 0, shapeRootSemitone: 4 }, // Edim
    { frets: ['X', 0, 1, 2, 1, 'X'], rootString: 1, shapeRootSemitone: 9 }, // Adim
    { frets: ['X', 'X', 0, 1, 3, 1], rootString: 2, shapeRootSemitone: 2 }, // Ddim
  ],
  'aug': [
    { frets: [0, 3, 2, 1, 1, 0], rootString: 0, shapeRootSemitone: 4 }, // Eaug
    { frets: ['X', 0, 3, 2, 2, 1], rootString: 1, shapeRootSemitone: 9 }, // Aaug
  ]
};

// Replace some with robust movable shapes for 6th and 5th string to ensure coverage
const MOVABLE_SHAPES: Record<string, ShapeDef[]> = {
  'major': [
    { frets: [0, 2, 2, 1, 0, 0], rootString: 0, shapeRootSemitone: 4 },
    { frets: ['X', 0, 2, 2, 2, 0], rootString: 1, shapeRootSemitone: 9 },
    { frets: ['X', 'X', 0, 2, 3, 2], rootString: 2, shapeRootSemitone: 2 },
    { frets: ['X', 3, 2, 0, 1, 0], rootString: 1, shapeRootSemitone: 0 }
  ],
  'minor': [
    { frets: [0, 2, 2, 0, 0, 0], rootString: 0, shapeRootSemitone: 4 },
    { frets: ['X', 0, 2, 2, 1, 0], rootString: 1, shapeRootSemitone: 9 },
    { frets: ['X', 'X', 0, 2, 3, 1], rootString: 2, shapeRootSemitone: 2 }
  ],
  'maj7': [
    { frets: [0, 'X', 1, 1, 0, 'X'], rootString: 0, shapeRootSemitone: 4 },
    { frets: ['X', 0, 2, 1, 2, 0], rootString: 1, shapeRootSemitone: 9 }
  ],
  'm7': [
    { frets: [0, 2, 0, 0, 0, 0], rootString: 0, shapeRootSemitone: 4 },
    { frets: ['X', 0, 2, 0, 1, 0], rootString: 1, shapeRootSemitone: 9 }
  ],
  '7': [
    { frets: [0, 2, 0, 1, 0, 0], rootString: 0, shapeRootSemitone: 4 },
    { frets: ['X', 0, 2, 0, 2, 0], rootString: 1, shapeRootSemitone: 9 }
  ],
  'm7b5': [
    { frets: [0, 'X', 0, 0, 1, 'X'], rootString: 0, shapeRootSemitone: 4 },
    { frets: ['X', 0, 1, 0, 1, 'X'], rootString: 1, shapeRootSemitone: 9 }
  ],
  'dim7': [
    { frets: [0, 'X', 2, 0, 2, 0], rootString: 0, shapeRootSemitone: 4 },
    { frets: ['X', 0, 1, 2, 1, 'X'], rootString: 1, shapeRootSemitone: 9 }
  ],
  'diminished': [
    { frets: [0, 1, 2, 'X', 'X', 'X'], rootString: 0, shapeRootSemitone: 4 },
    { frets: ['X', 0, 1, 2, 1, 'X'], rootString: 1, shapeRootSemitone: 9 }
  ]
};

export const getGuitarPositions = (rootNote: string, suffix: string, isSeventh: boolean): ChordPosition[] => {
  let typeKey: string | null = null;
  if (isSeventh) {
    if (suffix === 'maj7') typeKey = 'maj7';
    else if (suffix === '7') typeKey = '7';
    else if (suffix === 'm7') typeKey = 'm7';
    else if (suffix === 'minj7') typeKey = 'minj7';
    else if (suffix === 'maj7#5') typeKey = 'maj7#5';
    else if (suffix === 'min7/b5') typeKey = 'm7b5';
    else if (suffix === 'dim7') typeKey = 'dim7';
  } else {
    if (suffix === '') typeKey = 'major';
    else if (suffix === 'm') typeKey = 'minor';
    else if (suffix === 'dim') typeKey = 'diminished';
    else if (suffix === 'aug') typeKey = 'aug';
  }

  if (!typeKey) return [];

  const rootSemi = noteToSemitone(rootNote);
  const shapes = MOVABLE_SHAPES[typeKey] || SHAPES[typeKey];
  if (!shapes) return [];

  const positions: ChordPosition[] = [];

  for (const shape of shapes) {
    const baseOffset = (rootSemi - shape.shapeRootSemitone + 12) % 12;
    
    // Generate positions for offsets across the fretboard up to fret 21
    for (const octave of [0, 12, 24]) {
      const currentOffset = baseOffset + octave;
      
      const newFrets = shape.frets.map(f => {
        if (f === 'X') return 'X';
        return (f as number) + currentOffset;
      });

      const fretsNumeric = newFrets.filter(f => f !== 'X') as number[];
      if (fretsNumeric.length === 0) continue;

      const minFret = Math.min(...fretsNumeric);
      const maxFret = Math.max(...fretsNumeric);

      // Only include positions that fit on the fretboard (up to fret 21)
      if (minFret >= 0 && maxFret <= 21) {
        let baseFret = 1;
        // The display logic typically uses the minimum played fret as the base fret
        // when the chord doesn't involve open strings and spans past the first 4 frets.
        if (minFret > 0 && maxFret > 4) {
          baseFret = minFret;
        }

        // Avoid adding exact duplicates if they somehow occur
        const isDuplicate = positions.some(p => JSON.stringify(p.frets) === JSON.stringify(newFrets));
        if (!isDuplicate) {
          positions.push({
            frets: newFrets,
            baseFret
          });
        }
      }
    }
  }

  // Sort by base fret so open chords appear first
  return positions.sort((a, b) => a.baseFret - b.baseFret);
};
