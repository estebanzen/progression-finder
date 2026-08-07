import React from 'react';
import type { ChordPosition } from '../utils/guitarChords';

const OPEN_STRING_NOTES = [4, 11, 7, 2, 9, 4]; // e, B, G, D, A, E
const STRING_NAMES = ['e', 'B', 'G', 'D', 'A', 'E'];
const FRET_MARKERS = [3, 5, 7, 12, 15];

interface ScaleFretboardProps {
  notes: string[];
  fretCount?: number;
}

const noteToPitchClass = (note: string): number | null => {
  const match = note.match(/^([A-G])(#|b)?$/);
  if (!match) return null;

  const naturalNotes: Record<string, number> = {
    C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
  };
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  return (naturalNotes[match[1]] + accidental + 12) % 12;
};

export const ScaleFretboard: React.FC<ScaleFretboardProps> = ({
  notes,
  fretCount = 15,
}) => {
  const selectedPitchClasses = new Set(
    notes.map(noteToPitchClass).filter((note): note is number => note !== null),
  );

  return (
    <div className="scale-fretboard-section">
      <div className="scale-fretboard-title">Escala en el diapasón</div>
      <div className="scale-fretboard-scroll">
        <div
          className="scale-fretboard"
          style={{ '--fret-count': fretCount } as React.CSSProperties}
          aria-label={`Diapasón con las notas ${notes.join(', ')}`}
        >
          <div className="scale-string-labels" aria-hidden="true">
            {STRING_NAMES.map((name, stringIndex) => (
              <span key={`${name}-${stringIndex}`}>{name}</span>
            ))}
          </div>
          <div className="scale-fret-grid">
            <div className="scale-fret-markers" aria-hidden="true">
              {FRET_MARKERS.filter((fret) => fret <= fretCount).map((fret) => (
                <span
                  className={`scale-fret-marker ${fret === 12 ? 'double' : ''}`}
                  key={fret}
                  style={{
                    left: `calc(26px + ((100% - 26px) / ${fretCount}) * ${fret - 0.5})`,
                  }}
                >
                  <i />
                  {fret === 12 && <i />}
                </span>
              ))}
            </div>
            {OPEN_STRING_NOTES.map((openNote, stringIndex) => (
              <div className="scale-string" key={stringIndex}>
                {Array.from({ length: fretCount + 1 }, (_, fret) => {
                  const isSelected = selectedPitchClasses.has((openNote + fret) % 12);
                  return (
                    <div
                      className={`scale-fret ${fret === 0 ? 'open-fret' : ''}`}
                      key={fret}
                    >
                      {isSelected && <span className="scale-note-dot" />}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface GuitarDiagramProps {
  position: ChordPosition;
  chordName: string;
}

export const GuitarDiagram: React.FC<GuitarDiagramProps> = ({ position, chordName }) => {
  const { frets, baseFret } = position;
  const numFrets = 4;
  const stringNames = ['E', 'A', 'D', 'G', 'B', 'e'];

  // Adjust frets for display if not open position
  const displayFrets = frets.map(f => {
    if (f === 'X' || f === 0) return f;
    return baseFret === 1 ? f : (f as number) - baseFret + 1;
  });

  return (
    <div className="guitar-diagram">
      <div className="diagram-header">{chordName}</div>
      <div className="fretboard">
        {/* Base fret indicator */}
        {baseFret > 1 && (
          <div className="base-fret-label">{baseFret}fr</div>
        )}

        {/* Open/Muted string indicators */}
        <div className="string-indicators">
          {displayFrets.map((f, i) => (
            <div key={i} className="indicator">
              {f === 'X' ? '×' : f === 0 ? '○' : ''}
            </div>
          ))}
        </div>

        {/* The Grid */}
        <div className="grid">
          <div className="nut" style={{ height: baseFret === 1 ? '4px' : '1px' }}></div>
          {[...Array(numFrets)].map((_, r) => (
            <div key={r} className="fret-row">
              {[...Array(5)].map((_, c) => (
                <div key={c} className="fret-cell"></div>
              ))}
            </div>
          ))}

          {/* Dots */}
          {displayFrets.map((f, i) => {
            if (f === 'X' || f === 0) return null;
            const fretIdx = (f as number) - 1;
            // X position: each string is 20% apart. Left: 0%, 20%, 40%, 60%, 80%, 100%
            const leftPos = (i * 20);
            // Y position: middle of the fret
            const topPos = (fretIdx * 25) + 12.5;
            return (
              <div
                key={i}
                className="fret-dot"
                style={{
                  left: `${leftPos}%`,
                  top: `${topPos}%`
                }}
              />
            );
          })}
        </div>

        {/* String Names */}
        <div className="string-names">
          {stringNames.map((s, i) => (
            <div key={i}>{s}</div>
          ))}
        </div>
      </div>
    </div>
  );
};
