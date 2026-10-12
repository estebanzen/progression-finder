import { pitchClass } from '../utils/noteSpelling';

interface PianoKeyboardProps {
  whiteKeys: string[];
  blackKeys: Array<{ note: string; left: number }>;
  isActive: (note: string) => boolean;
  isRoot: (note: string) => boolean;
  onPlay: (note: string) => void;
  compact?: boolean;
  noteLabels?: string[];
}

export function PianoKeyboard({
  whiteKeys,
  blackKeys,
  isActive,
  isRoot,
  onPlay,
  compact = false,
  noteLabels = [],
}: PianoKeyboardProps) {
  const label = (note: string) => noteLabels.find(name => pitchClass(name) === pitchClass(note)) ?? note.replace(/\d+$/, '');
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
              aria-label={`Tocar ${label(keyNote)}${keyNote.match(/\d+$/)?.[0] ?? ''}`}
              title={`Tocar ${label(keyNote)}`}
            >
              <span className="key-note-label">{label(keyNote)}</span>
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
            aria-label={`Tocar ${label(note)}${note.match(/\d+$/)?.[0] ?? ''}`}
            title={`Tocar ${label(note)}`}
          >
            <span className="key-note-label">{label(note)}</span>
          </button>
        );
      })}
    </div>
  );
}
