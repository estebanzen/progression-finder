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
