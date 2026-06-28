import React from 'react';
import type { ChordPosition } from '../utils/guitarChords';

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
