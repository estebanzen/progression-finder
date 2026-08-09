export const WHITE_KEYS = [
  "C4", "D4", "E4", "F4", "G4", "A4", "B4",
  "C5", "D5", "E5", "F5", "G5", "A5", "B5",
];

export const BLACK_KEYS = [
  { note: "C#4", left: 4.74 },
  { note: "D#4", left: 11.88 },
  { note: "F#4", left: 26.17 },
  { note: "G#4", left: 33.31 },
  { note: "A#4", left: 40.45 },
  { note: "C#5", left: 54.74 },
  { note: "D#5", left: 61.88 },
  { note: "F#5", left: 76.17 },
  { note: "G#5", left: 83.31 },
  { note: "A#5", left: 90.45 },
];

export const CHORD_WHITE_KEYS = WHITE_KEYS.slice(0, 7);
export const CHORD_BLACK_KEYS = [
  { note: "C#4", left: 9.49 },
  { note: "D#4", left: 23.77 },
  { note: "F#4", left: 52.35 },
  { note: "G#4", left: 66.63 },
  { note: "A#4", left: 80.92 },
];

interface PianoKeyboardProps {
  whiteKeys: string[];
  blackKeys: Array<{ note: string; left: number }>;
  isActive: (note: string) => boolean;
  isRoot: (note: string) => boolean;
  onPlay: (note: string) => void;
  compact?: boolean;
}

export function PianoKeyboard({
  whiteKeys,
  blackKeys,
  isActive,
  isRoot,
  onPlay,
  compact = false,
}: PianoKeyboardProps) {
  return (
    <div className={`piano-keys-wrapper ${compact ? "compact" : ""}`}>
      <div className="piano-white-keys">
        {whiteKeys.map((keyNote) => {
          const active = isActive(keyNote);
          const root = active && isRoot(keyNote);
          return (
            <button
              type="button"
              key={keyNote}
              className={`piano-key-white ${active ? "active" : ""} ${root ? "root" : ""}`}
              onClick={() => onPlay(keyNote)}
              aria-label={`Tocar ${keyNote}`}
              title={`Tocar ${keyNote}`}
            >
              <span className="key-note-label">{keyNote.replace(/\d+$/, "")}</span>
            </button>
          );
        })}
      </div>

      {blackKeys.map(({ note, left }) => {
        const active = isActive(note);
        const root = active && isRoot(note);
        return (
          <button
            type="button"
            key={note}
            className={`piano-key-black ${active ? "active" : ""} ${root ? "root" : ""}`}
            style={{ left: `${left}%` }}
            onClick={() => onPlay(note)}
            aria-label={`Tocar ${note}`}
            title={`Tocar ${note}`}
          >
            <span className="key-note-label">{note.replace(/\d+$/, "")}</span>
          </button>
        );
      })}
    </div>
  );
}
