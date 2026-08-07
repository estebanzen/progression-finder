import type { ChordPosition } from './guitarChords';

export type ExportMode = 'transparent' | 'bw';

export const exportChordDiagram = (
  chordName: string,
  position: ChordPosition,
  positionIndex: number,
  mode: ExportMode
) => {
  const canvas = document.createElement('canvas');
  const size = 1080;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Setup styles
  const isBW = mode === 'bw';

  if (isBW) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);
  } else {
    ctx.clearRect(0, 0, size, size);
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const { frets, baseFret } = position;

  // Layout params (Centered 1080x1080)
  const headerHeight = 250;
  const topMargin = 300;
  const sideMargin = 200;
  const boardWidth = size - sideMargin * 2;
  const boardHeight = size - topMargin - 150;

  const numStrings = 6;
  const numFrets = 4;

  const stringSpacing = boardWidth / (numStrings - 1);
  const fretSpacing = boardHeight / numFrets;

  // Draw Chord Name
  ctx.font = 'bold 140px Inter, Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(chordName, size / 2, headerHeight / 2 + 30);

  // Determine displayed frets
  const displayFrets = frets.map(f => {
    if (f === 'X' || f === 0) return f;
    return baseFret === 1 ? f : (f as number) - baseFret + 1;
  });

  // Base fret text
  if (baseFret > 1) {
    ctx.font = 'bold 60px Inter, Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${baseFret}fr`, sideMargin - 40, topMargin + fretSpacing / 2);
  }

  // Draw Strings
  ctx.lineWidth = 8;
  for (let i = 0; i < numStrings; i++) {
    const x = sideMargin + i * stringSpacing;
    ctx.beginPath();
    ctx.moveTo(x, topMargin);
    ctx.lineTo(x, topMargin + boardHeight);
    ctx.stroke();
  }

  // Draw Frets
  for (let i = 0; i <= numFrets; i++) {
    const y = topMargin + i * fretSpacing;
    ctx.lineWidth = (i === 0 && baseFret === 1) ? 24 : 8;

    const drawY = (i === 0 && baseFret === 1) ? y - 8 : y;

    ctx.beginPath();
    ctx.lineCap = 'square';
    ctx.moveTo(sideMargin, drawY);
    ctx.lineTo(sideMargin + boardWidth, drawY);
    ctx.stroke();
  }
  ctx.lineCap = 'round'; // reset for other drawings

  // Draw barre chord indicator (if applicable)
  const fretted = displayFrets.filter(f => typeof f === 'number' && f > 0) as number[];
  const minFret = fretted.length > 0 ? Math.min(...fretted) : -1;

  if (minFret !== -1) {
    const minFretStrings = displayFrets
      .map((f, idx) => ({ f, idx }))
      .filter(item => item.f === minFret)
      .map(item => item.idx);

    if (minFretStrings.length > 1) {
      const minStr = Math.min(...minFretStrings);
      const maxStr = Math.max(...minFretStrings);

      const y = topMargin + (minFret - 1) * fretSpacing + fretSpacing / 2;
      const xStart = sideMargin + minStr * stringSpacing;
      const xEnd = sideMargin + maxStr * stringSpacing;

      ctx.beginPath();
      ctx.lineWidth = 70; // Barre thickness
      ctx.moveTo(xStart, y);
      ctx.lineTo(xEnd, y);
      ctx.stroke();
    }
  }

  // Draw dots and open/muted strings
  for (let i = 0; i < numStrings; i++) {
    const f = displayFrets[i];
    const x = sideMargin + i * stringSpacing;

    if (f === 'X') {
      // Draw X
      ctx.lineWidth = 10;
      const markerSize = 25;
      const markerY = topMargin - 60;
      ctx.beginPath();
      ctx.moveTo(x - markerSize, markerY - markerSize);
      ctx.lineTo(x + markerSize, markerY + markerSize);
      ctx.moveTo(x + markerSize, markerY - markerSize);
      ctx.lineTo(x - markerSize, markerY + markerSize);
      ctx.stroke();
    } else if (f === 0) {
      // Draw O
      ctx.lineWidth = 10;
      const markerSize = 25;
      const markerY = topMargin - 60;
      ctx.beginPath();
      ctx.arc(x, markerY, markerSize, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Draw Dot
      const fretIdx = (f as number) - 1;
      const y = topMargin + fretIdx * fretSpacing + fretSpacing / 2;
      ctx.beginPath();
      ctx.arc(x, y, 35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Download logic
  const filenameChord = chordName.replace(/[^a-zA-Z0-9]/g, '');
  const filename = `${filenameChord}_pos${positionIndex + 1}_${mode}.png`;

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

const SCALE_OPEN_STRINGS = [4, 11, 7, 2, 9, 4];
const SCALE_STRING_NAMES = ['e', 'B', 'G', 'D', 'A', 'E'];

const scaleNoteToPitchClass = (note: string): number | null => {
  const match = note.match(/^([A-G])(#|b)?$/);
  if (!match) return null;
  const naturals: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  return (naturals[match[1]] + accidental + 12) % 12;
};

export const exportScaleFretboard = (notes: string[], mode: ExportMode, fretCount = 15) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const isBW = mode === 'bw';
  if (isBW) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  const selectedNotes = new Set(
    notes.map(scaleNoteToPitchClass).filter((note): note is number => note !== null),
  );
  const left = 160;
  const top = 330;
  const boardWidth = canvas.width - left - 100;
  const boardHeight = 420;
  const stringSpacing = boardHeight / 5;
  const openWidth = 70;
  const fretWidth = (boardWidth - openWidth) / fretCount;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 86px Inter, Roboto, sans-serif';
  ctx.fillText('Escala en el diapasón', canvas.width / 2, 150);

  for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
    const y = top + stringIndex * stringSpacing;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + boardWidth, y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = 'bold 36px Inter, Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(SCALE_STRING_NAMES[stringIndex], left - 35, y);

    for (let fret = 0; fret <= fretCount; fret++) {
      if (!selectedNotes.has((SCALE_OPEN_STRINGS[stringIndex] + fret) % 12)) continue;
      const x = fret === 0 ? left + openWidth / 2 : left + openWidth + (fret - 0.5) * fretWidth;
      ctx.beginPath();
      ctx.fillStyle = isBW ? '#ffffff' : '#a855f7';
      ctx.arc(x, y, 24, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = '#ffffff';
  for (let fret = 0; fret <= fretCount; fret++) {
    const x = left + openWidth + fret * fretWidth;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = fret === 0 ? 10 : 5;
    ctx.beginPath();
    ctx.moveTo(x, top - stringSpacing / 2);
    ctx.lineTo(x, top + boardHeight + stringSpacing / 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const safeNotes = notes.join('-').replace(/[^a-zA-Z0-9#-]/g, '');
  const link = document.createElement('a');
  link.download = `escala_${safeNotes}_${mode}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
