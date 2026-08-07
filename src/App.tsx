import { useState, useEffect, useRef } from "react";
import * as Tone from "tone";
import {
  Music,
  Play,
  Volume2,
  VolumeX,
  Info,
  Sparkles,
  Loader2,
  Maximize2,
  Minimize2,
  List,
} from "lucide-react";
import { ChordCard } from "./components/ChordCard";
import { CollapsiblePanel } from "./components/CollapsiblePanel";
import { GuitarDiagram } from "./components/GuitarDiagram";
import {
  getGuitarPositions,
  transposeNote,
  getGuitarVoicing,
} from "./utils/guitarChords";
import { exportChordDiagram } from "./utils/exportDiagram";
import { usePersistentPanelState } from "./hooks/usePersistentPanelState";
import { useLocalStorage } from "./hooks/useLocalStorage";
import "./App.css";

const BASE_URL = import.meta.env.BASE_URL;
// Pitch class map to calculate intervals
const noteToSemits: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  "E#": 5,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
  "B#": 0,
};

// Normalize input notes (supports C, C#, Db, c, c#, db, etc.)
const normalizeNote = (noteStr: string): string | null => {
  const cleaned = noteStr.trim();
  if (!cleaned) return null;
  const match = cleaned.match(/^([a-gA-G])(#|b)?$/);
  if (!match) return null;
  const base = match[1].toUpperCase();
  const accidental = match[2] ? (match[2] === "#" ? "#" : "b") : "";
  return base + accidental;
};

// Generate triad voicing ascending from baseOctave
const getVoicedNotes = (
  root: string,
  third: string,
  fifth: string,
  baseOctave = 4,
): string[] => {
  const rSem = noteToSemits[root] ?? 0;
  const tSem = noteToSemits[third] ?? 0;
  const fSem = noteToSemits[fifth] ?? 0;

  let thirdOctave = baseOctave;
  if (tSem <= rSem) thirdOctave = baseOctave + 1;

  let fifthOctave = thirdOctave;
  if (fSem <= tSem) fifthOctave = thirdOctave + 1;
  else if (fSem < rSem && thirdOctave === baseOctave)
    fifthOctave = baseOctave + 1;

  return [
    `${root}${baseOctave}`,
    `${third}${thirdOctave}`,
    `${fifth}${fifthOctave}`,
  ];
};

// Generate 7th-chord voicing ascending from baseOctave
const getVoicedNotesseventh = (
  root: string,
  third: string,
  fifth: string,
  seventh: string,
  baseOctave = 4,
): string[] => {
  const rSem = noteToSemits[root] ?? 0;
  const tSem = noteToSemits[third] ?? 0;
  const fSem = noteToSemits[fifth] ?? 0;
  const sSem = noteToSemits[seventh] ?? 0;

  let thirdOctave = baseOctave;
  if (tSem <= rSem) thirdOctave = baseOctave + 1;

  let fifthOctave = thirdOctave;
  if (fSem <= tSem) fifthOctave = thirdOctave + 1;
  else if (fSem < rSem && thirdOctave === baseOctave)
    fifthOctave = baseOctave + 1;

  let seventhOctave = fifthOctave;
  if (sSem <= fSem) seventhOctave = fifthOctave + 1;
  else if (sSem < rSem && fifthOctave === baseOctave)
    seventhOctave = baseOctave + 1;

  return [
    `${root}${baseOctave}`,
    `${third}${thirdOctave}`,
    `${fifth}${fifthOctave}`,
    `${seventh}${seventhOctave}`,
  ];
};

// Recompute voiced notes for a chord at a given baseOctave (for playback only)
const getVoicedNotesForChord = (
  chord: ChordInfo,
  baseOctave: number,
): string[] => {
  if (chord.isSeventhChord && chord.seventh) {
    return getVoicedNotesseventh(
      chord.root,
      chord.third,
      chord.fifth,
      chord.seventh,
      baseOctave,
    );
  }
  return getVoicedNotes(chord.root, chord.third, chord.fifth, baseOctave);
};

export interface ChordInfo {
  root: string;
  third: string;
  fifth: string;
  seventh?: string;
  type:
    | "major"
    | "minor"
    | "diminished"
    | "dominant"
    | "halfdiminished"
    | "unknown";
  name: string;
  notes: string[];
  voicedNotes: string[];
  isSeventhChord?: boolean;
}

// 2-Octave Piano Setup (C4 to B5)
const WHITE_KEYS = [
  "C4",
  "D4",
  "E4",
  "F4",
  "G4",
  "A4",
  "B4",
  "C5",
  "D5",
  "E5",
  "F5",
  "G5",
  "A5",
  "B5",
];

const BLACK_KEYS = [
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

const PRESETS = [
  { name: "Do Mayor (C)", notes: "C D E F G A B" },
  { name: "La Menor (Am)", notes: "A B C D E F G" },
  { name: "Sol Mayor (G)", notes: "G A B C D E F#" },
  { name: "Mi Menor (Em)", notes: "E F# G A B C D" },
  { name: "Fa Mayor (F)", notes: "F G A Bb C D E" },
  { name: "Re Menor (Dm)", notes: "D E F G A Bb C" },
  { name: "La Armónica m", notes: "A B C D E F G#" },
  { name: "C Dórico", notes: "C D Eb F G A Bb" },
];

const INSTRUMENTS = [
  {
    id: "piano",
    name: "Grand Piano",
    icon: "🎹",
    desc: "Acústico, cálido y brillante",
    baseUrl: `${BASE_URL}/samples/piano/`,
  },
  {
    id: "rhodes",
    name: "Rhodes",
    icon: "🎹",
    desc: "Eléctrico suave — soul, jazz, funk",
    baseUrl: `${BASE_URL}/samples/rhodes/`,
  },
  {
    id: "wurlitzer",
    name: "Electric Organ",
    icon: "🎹",
    desc: "Carácter vintage y agresivo",
    baseUrl: `${BASE_URL}/samples/wurlitzer/`,
  },
  {
    id: "clavinet",
    name: "Clavinet",
    icon: "🥁",
    desc: "Percusivo, funk y disco",
    baseUrl: `${BASE_URL}/samples/clavinet/`,
  },
  {
    id: "nylon-guitar",
    name: "Nylon Guitar",
    icon: "🎸",
    desc: "Guitarra acústica, ataque suave",
    baseUrl: `${BASE_URL}/samples/nylon-guitar/`,
  },
] as const;

type InstrumentType = (typeof INSTRUMENTS)[number]["id"];

const SAMPLER_URLS = {
  C2: "C2.mp3",
  C3: "C3.mp3",
  C4: "C4.mp3",
  C5: "C5.mp3",
  C6: "C6.mp3",
};

type PlayMode = "chord" | "arpeggio";

function App() {
  const [rawInput, setRawInput] = useState(() => {
    return localStorage.getItem("current_scale_notes") || "C D E F G A B";
  });
  const [parsedNotes, setParsedNotes] = useState<string[]>([]);
  const [chords, setChords] = useState<ChordInfo[]>([]);
  const [selectedChord, setSelectedChord] = useState<ChordInfo | null>(null);
  const [audioState, setAudioState] = useState(false);
  const [playMode, setPlayMode] = useLocalStorage<PlayMode>(
    "progressionFinder_playMode",
    "chord",
  );

  const [chordType, setChordType] = useLocalStorage(
    "progressionFinder_chordType",
    "triads",
  );
  const showSevenths = chordType === "sevenths";
  const setShowSevenths = (val: boolean) =>
    setChordType(val ? "sevenths" : "triads");

  const [baseOctave, setBaseOctave] = useState(() => {
    const saved = localStorage.getItem("selected_octave");
    return saved ? parseInt(saved, 10) : 4;
  });

  useEffect(() => {
    localStorage.setItem("current_scale_notes", rawInput);
  }, [rawInput]);

  useEffect(() => {
    localStorage.setItem("selected_octave", baseOctave.toString());
  }, [baseOctave]);

  useEffect(() => {
    if (selectedChord) {
      localStorage.setItem("selected_chord", selectedChord.name);
    }
  }, [selectedChord]);

  const [viewMode, setViewMode] = useLocalStorage(
    "progressionFinder_viewMode",
    "full",
  );
  const compactMode = viewMode === "compact";
  const setCompactMode = (val: boolean) =>
    setViewMode(val ? "compact" : "full");

  const [panelScalesOpen, setPanelScalesOpen] = usePersistentPanelState(
    "panel_scales_open",
    false,
  );
  const [panelAudioOpen, setPanelAudioOpen] = usePersistentPanelState(
    "panel_audio_open",
    false,
  );
  const [panelChordsOpen, setPanelChordsOpen] = usePersistentPanelState(
    "panel_chords_open",
    true,
  );

  const [panelDetailsOpen, setPanelDetailsOpen] = usePersistentPanelState(
    "panel_details_open",
    true,
  );
  const [panelPianoOpen, setPanelPianoOpen] = usePersistentPanelState(
    "panel_piano_open",
    true,
  );
  const [panelGuitarOpen, setPanelGuitarOpen] = usePersistentPanelState(
    "panel_guitar_open",
    true,
  );
  const [explorationChord, setExplorationChord] = useState<ChordInfo | null>(
    null,
  );
  const [selectedPositionIdx, setSelectedPositionIdx] = useState(0);

  // Sync exploration chord with selected grid chord
  useEffect(() => {
    setExplorationChord(selectedChord);
    setSelectedPositionIdx(0);
  }, [selectedChord]);

  const [currentInstrument, setCurrentInstrument] = useState<InstrumentType>(
    () => {
      const saved = localStorage.getItem("selected_instrument");
      if (saved && INSTRUMENTS.some((i) => i.id === saved)) {
        return saved as InstrumentType;
      }
      return "piano";
    },
  );

  useEffect(() => {
    localStorage.setItem("selected_instrument", currentInstrument);
  }, [currentInstrument]);

  const [instrumentLoading, setInstrumentLoading] = useState<boolean>(true);
  const [instrumentError, setInstrumentError] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(100);
  const [manuallyPressedKeys, setManuallyPressedKeys] = useState<
    Record<string, boolean>
  >({});

  const samplersRef = useRef<Record<string, Tone.Sampler | null>>({
    piano: null,
    rhodes: null,
    wurlitzer: null,
    clavinet: null,
    "nylon-guitar": null,
    "jazz-guitar": null,
  });
  const activeInstrumentRef = useRef<InstrumentType>(currentInstrument);
  const limiterRef = useRef<Tone.Limiter | null>(null);

  const getLimiter = (): Tone.Limiter => {
    if (!limiterRef.current) {
      limiterRef.current = new Tone.Limiter(-1.5).toDestination();
    }
    return limiterRef.current;
  };

  const loadInstrument = (instType: InstrumentType) => {
    if (samplersRef.current[instType]) {
      setInstrumentLoading(false);
      return;
    }

    setInstrumentLoading(true);
    setInstrumentError(null);
    const config = INSTRUMENTS.find((i) => i.id === instType);
    if (!config) return;

    console.log(`Loading instrument: ${config.name}`);
    Object.values(SAMPLER_URLS).forEach((url) => {
      console.log(`Loading sample: ${url}`);
    });

    const sampler = new Tone.Sampler({
      urls: SAMPLER_URLS,
      baseUrl: config.baseUrl,
      onload: () => {
        console.log(`Instrument loaded successfully: ${config.name}`);
        samplersRef.current[instType] = sampler;
        sampler.connect(getLimiter());
        sampler.set({ release: 1.6, volume: -5 });
        if (activeInstrumentRef.current === instType) {
          setInstrumentLoading(false);
        }
      },
      onerror: (err) => {
        console.error(`Sampler initialization failed for ${config.name}:`, err);
        setInstrumentError(
          `No se pudo cargar "${config.name}". Volviendo a Grand Piano.`,
        );
        // Fallback to piano
        if (instType !== "piano") {
          activeInstrumentRef.current = "piano";
          setCurrentInstrument("piano");
          if (samplersRef.current["piano"]) {
            setInstrumentLoading(false);
          } else {
            loadInstrument("piano");
          }
        } else {
          setInstrumentLoading(false);
        }
        // Auto-clear error after 4 s
        setTimeout(() => setInstrumentError(null), 4000);
      },
    });
  };

  const selectInstrument = (instType: InstrumentType) => {
    activeInstrumentRef.current = instType;
    setCurrentInstrument(instType);
    if (samplersRef.current[instType]) {
      setInstrumentLoading(false);
    } else {
      loadInstrument(instType);
    }
  };

  // Sync volume with Tone.Destination
  useEffect(() => {
    if (volume === 0) {
      Tone.Destination.mute = true;
    } else {
      Tone.Destination.mute = false;
      const db = Tone.gainToDb(volume / 100);
      Tone.Destination.volume.value = db;
    }
  }, [volume]);

  // Load instrument on mount
  useEffect(() => {
    loadInstrument(currentInstrument);
    return () => {
      Object.values(samplersRef.current).forEach((s) => s?.dispose());
      limiterRef.current?.dispose();
    };
  }, []);

  // Parse notes on input change
  useEffect(() => {
    const parts = rawInput.split(/[\s,;]+/);
    const validNotes: string[] = [];
    parts.forEach((part) => {
      const normalized = normalizeNote(part);
      if (normalized && !validNotes.includes(normalized)) {
        validNotes.push(normalized);
      }
    });
    setParsedNotes(validNotes);
  }, [rawInput]);

  // Build diatonic triads or seventh chords when parsed notes or mode changes
  useEffect(() => {
    const N = parsedNotes.length;
    const minNotes = showSevenths ? 4 : 3;
    if (N < minNotes) {
      setChords([]);
      setSelectedChord(null);
      return;
    }

    const detectedChords: ChordInfo[] = [];

    for (let i = 0; i < N; i++) {
      const root = parsedNotes[i];
      const third = parsedNotes[(i + 2) % N];
      const fifth = parsedNotes[(i + 4) % N];

      const rSem = noteToSemits[root] ?? 0;
      const tSem = noteToSemits[third] ?? 0;
      const fSem = noteToSemits[fifth] ?? 0;

      const interval3 = (tSem - rSem + 12) % 12;
      const interval5 = (fSem - rSem + 12) % 12;

      if (showSevenths) {
        const seventh = parsedNotes[(i + 6) % N];
        const sSem = noteToSemits[seventh] ?? 0;
        const interval7 = (sSem - rSem + 12) % 12;

        let type: ChordInfo["type"] = "unknown";
        let suffix = "";

        // Major 7: M3 + P5 + M7
        if (interval3 === 4 && interval5 === 7 && interval7 === 11) {
          type = "major";
          suffix = "maj7";
          // Dominant 7: M3 + P5 + m7
        } else if (interval3 === 4 && interval5 === 7 && interval7 === 10) {
          type = "dominant";
          suffix = "7";
          // Minor 7: m3 + P5 + m7
        } else if (interval3 === 3 && interval5 === 7 && interval7 === 10) {
          type = "minor";
          suffix = "m7";
          // Half-diminished m7b5: m3 + d5 + m7
        } else if (interval3 === 3 && interval5 === 6 && interval7 === 10) {
          type = "halfdiminished";
          suffix = "m7b5";
          // Diminished 7: m3 + d5 + d7
        } else if (interval3 === 3 && interval5 === 6 && interval7 === 9) {
          type = "diminished";
          suffix = "dim7";
        } else {
          suffix = "?";
        }

        const name = `${root}${suffix}`;
        const voicedNotes = getVoicedNotesseventh(root, third, fifth, seventh);

        detectedChords.push({
          root,
          third,
          fifth,
          seventh,
          type,
          name,
          notes: [root, third, fifth, seventh],
          voicedNotes,
          isSeventhChord: true,
        });
      } else {
        let type: ChordInfo["type"] = "unknown";
        let suffix = "";

        if (interval3 === 4 && interval5 === 7) {
          type = "major";
          suffix = "";
        } else if (interval3 === 3 && interval5 === 7) {
          type = "minor";
          suffix = "m";
        } else if (interval3 === 3 && interval5 === 6) {
          type = "diminished";
          suffix = "dim";
        } else {
          if (interval3 === 4 && interval5 === 8) suffix = "aug";
          else if (interval3 === 5 && interval5 === 7) suffix = "sus4";
          else if (interval3 === 2 && interval5 === 7) suffix = "sus2";
          else suffix = "?";
        }

        const name = `${root}${suffix}`;
        const voicedNotes = getVoicedNotes(root, third, fifth);

        detectedChords.push({
          root,
          third,
          fifth,
          type,
          name,
          notes: [root, third, fifth],
          voicedNotes,
          isSeventhChord: false,
        });
      }
    }

    setChords(detectedChords);

    const savedChordName = localStorage.getItem("selected_chord");
    let chordToSelect = null;

    if (detectedChords.length > 0) {
      if (savedChordName) {
        chordToSelect =
          detectedChords.find((c) => c.name === savedChordName) ||
          detectedChords[0];
      } else {
        chordToSelect = detectedChords[0];
      }
    }

    setSelectedChord(chordToSelect);
  }, [parsedNotes, showSevenths]);

  // Internal helper: triggers notes as chord or arpeggio depending on playMode
  const triggerNotes = async (notes: string[]) => {
    if (Tone.context.state !== "running") await Tone.start();
    setAudioState(true);
    const sampler = samplersRef.current[activeInstrumentRef.current];
    if (!sampler) return;
    sampler.releaseAll();
    if (playMode === "arpeggio") {
      const now = Tone.now();
      notes.forEach((note, i) => {
        sampler.triggerAttackRelease(note, 1.8, now + i * 0.13);
      });
    } else {
      sampler.triggerAttackRelease(notes, 1.8);
    }
  };

  // Handle chord play — voiced notes are computed fresh from current baseOctave
  const handlePlayChord = async (chord: ChordInfo, octaveOverride?: number) => {
    setSelectedChord(chord);
    const oct = octaveOverride ?? baseOctave;
    const voiced = getVoicedNotesForChord(chord, oct);
    try {
      await triggerNotes(voiced);
    } catch (e) {
      console.warn("Playback failed:", e);
    }
  };

  const playGuitarVoicing = async (notes: string[]) => {
    try {
      await triggerNotes(notes);
    } catch (e) {
      console.warn("Playback failed:", e);
    }
  };

  const handleTranspose = (semitones: number) => {
    if (!explorationChord) return;
    const newRoot = transposeNote(explorationChord.root, semitones);
    const newThird = transposeNote(explorationChord.third, semitones);
    const newFifth = transposeNote(explorationChord.fifth, semitones);
    const newSeventh = explorationChord.seventh
      ? transposeNote(explorationChord.seventh, semitones)
      : undefined;

    const suffixMatch = explorationChord.name.match(/^[A-G](#|b)?(.*)$/);
    const suffix = suffixMatch ? suffixMatch[2] : "";
    const newName = `${newRoot}${suffix}`;

    const newNotes = [newRoot, newThird, newFifth];
    if (newSeventh) newNotes.push(newSeventh);

    let newVoicedNotes: string[];
    if (explorationChord.isSeventhChord && newSeventh) {
      newVoicedNotes = getVoicedNotesseventh(
        newRoot,
        newThird,
        newFifth,
        newSeventh,
        baseOctave,
      );
    } else {
      newVoicedNotes = getVoicedNotes(newRoot, newThird, newFifth, baseOctave);
    }

    const newChord: ChordInfo = {
      ...explorationChord,
      root: newRoot,
      third: newThird,
      fifth: newFifth,
      seventh: newSeventh,
      name: newName,
      notes: newNotes,
      voicedNotes: newVoicedNotes,
    };

    setExplorationChord(newChord);

    // Play guitar voicing if available
    const positions = getGuitarPositions(
      newRoot,
      suffix,
      newChord.isSeventhChord || false,
    );
    const idx =
      selectedPositionIdx < positions.length ? selectedPositionIdx : 0;
    setSelectedPositionIdx(idx);

    if (positions[idx]) {
      const voicing = getGuitarVoicing(positions[idx]);
      playGuitarVoicing(voicing);
    } else {
      // Fallback
      handlePlayChord(newChord, baseOctave);
    }
  };

  // Replay selected chord
  const handleReplay = async () => {
    if (!explorationChord) return;
    const suffixMatch = explorationChord.name.match(/^[A-G](#|b)?(.*)$/);
    const suffix = suffixMatch ? suffixMatch[2] : "";
    const positions = getGuitarPositions(
      explorationChord.root,
      suffix,
      explorationChord.isSeventhChord || false,
    );
    const idx =
      selectedPositionIdx < positions.length ? selectedPositionIdx : 0;

    if (positions[idx]) {
      const voicing = getGuitarVoicing(positions[idx]);
      playGuitarVoicing(voicing);
    } else {
      await handlePlayChord(explorationChord, baseOctave);
    }
  };

  // Octave shift helpers
  const octaveDown = () => setBaseOctave((o) => Math.max(1, o - 1));
  const octaveUp = () => setBaseOctave((o) => Math.min(7, o + 1));

  // Play individual note on piano click
  const handlePlayKey = async (note: string) => {
    setManuallyPressedKeys((prev) => ({ ...prev, [note]: true }));
    setTimeout(() => {
      setManuallyPressedKeys((prev) => ({ ...prev, [note]: false }));
    }, 350);

    try {
      if (Tone.context.state !== "running") {
        await Tone.start();
      }
      setAudioState(true);
      const sampler = samplersRef.current[activeInstrumentRef.current];
      if (sampler) {
        sampler.triggerAttackRelease(note, 1.2);
      }
    } catch (e) {
      console.warn("Playback failed:", e);
    }
  };

  // Helper to determine if a keyboard note matches one of the selected chord's notes
  const isKeyActive = (keyNote: string): boolean => {
    if (manuallyPressedKeys[keyNote]) return true;
    if (!explorationChord) return false;

    const keyMatch = keyNote.match(/^([A-G]#?|b?)([0-9])$/);
    if (!keyMatch) return false;
    const keyPC = keyMatch[1];
    const keyOct = keyMatch[2];

    return explorationChord.voicedNotes.some((voicedNote) => {
      const voicedMatch = voicedNote.match(/^([A-G]#?|b?)([0-9])$/);
      if (!voicedMatch) return false;
      const voicedPC = voicedMatch[1];
      const voicedOct = voicedMatch[2];

      if (keyOct !== voicedOct) return false;

      const keySem = noteToSemits[keyPC];
      const voicedSem = noteToSemits[voicedPC];
      return keySem === voicedSem;
    });
  };

  return (
    <div className="app-shell">
      <header className="app-navbar">
        <div className="app-navbar__inner">
          <div className="app-brand">
            <div className="logo-icon">
              <Music size={24} aria-hidden="true" />
            </div>
            <span>Progression Finder</span>
          </div>
          <button
            className={`global-btn ${compactMode ? "active" : ""}`}
            onClick={() => setCompactMode(!compactMode)}
            aria-label="Alternar modo compacto"
          >
            {compactMode ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            <span>Modo compacto</span>
          </button>
        </div>
      </header>

      <main className="container">
        {/* Scale notes and presets */}
        <CollapsiblePanel
          title="Escalas"
          icon={<Sparkles size={20} className="text-purple-400" />}
          compactMode={compactMode}
          isOpen={panelScalesOpen}
          onToggle={setPanelScalesOpen}
        >
          <div className="scales-grid">
            <section className="scale-block" aria-labelledby="scale-notes-title">
              <h3 id="scale-notes-title">Notas de la Escala</h3>
              <div className="input-group">
                <input
                  id="notes-input"
                  type="text"
                  placeholder="Ej: C D E F G A B"
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  aria-label="Notas de la escala en cifrado americano"
                />
                {!compactMode && (
                  <div className="input-help">
                    <Info size={14} />
                    <span>
                      Introduce notas separadas por espacios o comas. Se admiten
                      alteraciones (# y b).
                    </span>
                  </div>
                )}
              </div>

              <div className="parsed-notes-list">
                {parsedNotes.length > 0 ? (
                  parsedNotes.map((note, idx) => (
                    <span key={`${note}-${idx}`} className="note-badge">
                      {note}
                    </span>
                  ))
                ) : (
                  <span className="text-muted" style={{ fontSize: "0.9rem" }}>
                    Esperando notas válidas...
                  </span>
                )}
              </div>
            </section>

            <section className="scale-block" aria-labelledby="scale-presets-title">
              <h3 id="scale-presets-title">Presets de Escalas</h3>
              <div className="presets-container">
                {PRESETS.map((preset) => {
                  const isActive = rawInput === preset.notes;
                  return (
                    <button
                      key={preset.name}
                      className={`preset-btn ${isActive ? "active" : ""}`}
                      onClick={() => setRawInput(preset.notes)}
                      aria-label={`Aplicar escala ${preset.name}`}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </CollapsiblePanel>

        {/* Audio Controls Panel */}
        <CollapsiblePanel
          title="Controles de Audio"
          icon={<Volume2 size={20} className="text-purple-400" />}
          compactMode={compactMode}
          isOpen={panelAudioOpen}
          onToggle={setPanelAudioOpen}
          className="audio-controls-panel"
        >
          {/* Instrument error toast */}
          {instrumentError && (
            <div className="instrument-error-toast" role="alert">
              ⚠️ {instrumentError}
            </div>
          )}

          <div className="audio-controls-grid">
            {/* ── Instrument Selector ── */}
            <div className="control-group instrument-group">
              <h3>Instrumento</h3>
              <div className="instrument-grid">
                {INSTRUMENTS.map((inst) => {
                  const isActive = currentInstrument === inst.id;
                  const isLoading = isActive && instrumentLoading;
                  return (
                    <button
                      key={inst.id}
                      id={`instrument-${inst.id}`}
                      className={`instrument-card ${isActive ? "active" : ""} ${isLoading ? "loading" : ""} ${compactMode ? "compact" : ""}`}
                      onClick={() => selectInstrument(inst.id)}
                      aria-pressed={isActive}
                      aria-label={`Seleccionar instrumento ${inst.name}`}
                      title={inst.desc}
                    >
                      <span className="inst-icon">{inst.icon}</span>
                      <span className="inst-name">{inst.name}</span>
                      {isLoading && <span className="inst-loading-dot" />}
                      {isActive && !isLoading && (
                        <span className="inst-active-dot" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="control-group" style={{ minWidth: 0 }}>
              <h3>Modo de Reproducción</h3>
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  background: "rgba(0,0,0,0.25)",
                  padding: "4px",
                  borderRadius: "8px",
                  width: "fit-content",
                }}
              >
                {(["chord", "arpeggio"] as PlayMode[]).map((mode) => (
                  <button
                    key={mode}
                    id={`playmode-${mode}`}
                    onClick={() => setPlayMode(mode)}
                    aria-pressed={playMode === mode}
                    style={{
                      padding: "0.35rem 1rem",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 500,
                      fontSize: "0.85rem",
                      transition: "all 0.18s",
                      background:
                        playMode === mode
                          ? "var(--accent-purple, #9333ea)"
                          : "transparent",
                      color:
                        playMode === mode
                          ? "#fff"
                          : "var(--text-secondary, #a1a1aa)",
                    }}
                  >
                    {mode === "chord" ? "⏹ Chord" : "🎶 Arpeggio"}
                  </button>
                ))}
              </div>
            </div>
            <div className="control-group volume-group">
              <h3>Volumen General</h3>
              <div className="volume-control">
                <button
                  className="volume-mute-btn"
                  onClick={() => setVolume((v) => (v === 0 ? 80 : 0))}
                  aria-label="Silenciar / Activar sonido"
                >
                  {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="volume-slider"
                  aria-label="Control de volumen"
                />
                <span className="volume-percent">{volume}%</span>
              </div>
            </div>

            <div className="control-group octave-group">
              <h3>Base Octave</h3>
              <div className="octave-control">
                <button
                  className="octave-btn"
                  onClick={octaveDown}
                  disabled={baseOctave <= 1}
                  aria-label="Bajar octava"
                  title="Octave Down (−12 st)"
                >
                  −
                </button>
                <div className="octave-display" aria-live="polite">
                  <span className="octave-label">OCT</span>
                  <span className="octave-value">{baseOctave}</span>
                </div>
                <button
                  className="octave-btn"
                  onClick={octaveUp}
                  disabled={baseOctave >= 7}
                  aria-label="Subir octava"
                  title="Octave Up (+12 st)"
                >
                  +
                </button>
              </div>
              {!compactMode && (
                <>
                  <input
                    id="octave-range"
                    type="range"
                    min="1"
                    max="7"
                    value={baseOctave}
                    onChange={(e) => setBaseOctave(Number(e.target.value))}
                    className="octave-slider"
                    aria-label="Seleccionar octava base"
                  />
                  <div className="octave-range-labels">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                    <span>6</span>
                    <span>7</span>
                  </div>
                </>
              )}
            </div>

            <div className="control-group transposition-group">
              <h3>Transposición</h3>
              <div className="transpose-controls">
                <button
                  className="transpose-btn"
                  onClick={() => handleTranspose(-1)}
                  disabled={!explorationChord}
                  aria-label="Bajar un semitono"
                >
                  -1 Semitono
                </button>
                <span>Transportar</span>
                <button
                  className="transpose-btn"
                  onClick={() => handleTranspose(1)}
                  disabled={!explorationChord}
                  aria-label="Subir un semitono"
                >
                  +1 Semitono
                </button>
              </div>
            </div>
          </div>
        </CollapsiblePanel>

        {/* Main interactive stack */}
        <div
          className={`main-stack ${compactMode ? "compact" : ""}`}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            marginTop: "1.5rem",
          }}
        >
          {/* Chords List */}
          <CollapsiblePanel
            title="Acordes Diatónicos"
            icon={<List size={20} className="text-purple-400" />}
            compactMode={compactMode}
            isOpen={panelChordsOpen}
            onToggle={setPanelChordsOpen}
            headerControls={
              <div
                className="chord-mode-toggle"
                style={{ display: "flex", gap: "0.5rem" }}
              >
                <button
                  className={`mode-toggle-btn ${!showSevenths ? "active" : ""}`}
                  onClick={() => setShowSevenths(false)}
                  aria-pressed={!showSevenths}
                >
                  ☰ Tríadas
                </button>
                <button
                  className={`mode-toggle-btn ${showSevenths ? "active" : ""}`}
                  onClick={() => setShowSevenths(true)}
                  aria-pressed={showSevenths}
                >
                  ♩ Séptimas
                </button>
              </div>
            }
          >
            {parsedNotes.length < (showSevenths ? 4 : 3) ? (
              <div className="empty-state">
                <Music className="empty-state-icon" size={48} />
                <h3>Se necesitan al menos {showSevenths ? "4" : "3"} notas</h3>
                <p>
                  {showSevenths
                    ? "Introduce al menos cuatro notas para construir acordes de séptima."
                    : "Introduce al menos tres notas para construir tríadas diatónicas."}
                </p>
              </div>
            ) : chords.length === 0 ? (
              <div className="empty-state">
                <Music className="empty-state-icon" size={48} />
                <h3>No se detectaron acordes</h3>
                <p>
                  Verifica que las notas estén escritas correctamente (A, Bb,
                  C#, D, etc.).
                </p>
              </div>
            ) : (
              <div className={`chords-grid ${compactMode ? "compact" : ""}`}>
                {chords.map((chord, index) => (
                  <ChordCard
                    key={`${chord.name}-${index}`}
                    chord={chord}
                    isSelected={explorationChord?.name === chord.name}
                    onPlay={handlePlayChord}
                  />
                ))}
              </div>
            )}
          </CollapsiblePanel>

          {/* Details and following panels */}
          {explorationChord ? (
            <>
              <CollapsiblePanel
                title="Detalles del Acorde"
                icon={<Music size={20} className="text-purple-400" />}
                compactMode={compactMode}
                isOpen={panelDetailsOpen}
                onToggle={setPanelDetailsOpen}
              >
                <div style={{ position: "relative" }}>
                  {instrumentLoading && (
                    <div className="instrument-loading-overlay">
                      <Loader2
                        className="loading-spinner animate-spin"
                        size={32}
                      />
                      <span>Loading Instruments...</span>
                    </div>
                  )}
                  <div
                    className="detail-panel"
                    style={{
                      padding: 0,
                      background: "transparent",
                      border: "none",
                    }}
                  >
                    <div className="detail-header">
                      <div className="detail-title">
                        <div className="detail-chord-name">
                          {explorationChord.name}
                        </div>
                        <div className="detail-chord-type">
                          {explorationChord.isSeventhChord
                            ? "Séptima"
                            : "Tríada"}{" "}
                          {explorationChord.type === "halfdiminished"
                            ? "Half-Diminished"
                            : explorationChord.type === "dominant"
                              ? "Dominante"
                              : explorationChord.type === "unknown"
                                ? "No estándar"
                                : explorationChord.type}
                        </div>
                      </div>
                      <button
                        className="play-large-btn"
                        onClick={handleReplay}
                        aria-label="Volver a reproducir acorde"
                      >
                        <Play size={22} fill="white" />
                      </button>
                    </div>

                    {/* Intervals Breakdown */}
                    <div
                      className={`notes-breakdown ${explorationChord.isSeventhChord ? "four-notes" : ""}`}
                    >
                      <div className="breakdown-card">
                        <div className="breakdown-label">Tónica</div>
                        <div className="breakdown-value">
                          {explorationChord.root}
                        </div>
                      </div>
                      <div className="breakdown-card">
                        <div className="breakdown-label">Tercera</div>
                        <div className="breakdown-value">
                          {explorationChord.third}
                        </div>
                      </div>
                      <div className="breakdown-card">
                        <div className="breakdown-label">Quinta</div>
                        <div className="breakdown-value">
                          {explorationChord.fifth}
                        </div>
                      </div>
                      {explorationChord.isSeventhChord &&
                        explorationChord.seventh && (
                          <div className="breakdown-card">
                            <div className="breakdown-label">Séptima</div>
                            <div className="breakdown-value">
                              {explorationChord.seventh}
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Audio feedback line */}
                    <div
                      className="audio-status-bar"
                      style={{ marginTop: "1.5rem" }}
                    >
                      <div
                        className={`audio-status-dot ${audioState ? "active" : ""}`}
                      />
                      <span>
                        {audioState
                          ? `Audio Activo (${INSTRUMENTS.find((i) => i.id === currentInstrument)?.name})`
                          : "Audio Inactivo (Haz clic para activar)"}
                      </span>
                      {audioState ? (
                        <Volume2 size={16} />
                      ) : (
                        <VolumeX size={16} />
                      )}
                    </div>
                  </div>
                </div>
              </CollapsiblePanel>
              {/* Guitar View */}
              <CollapsiblePanel
                title="Guitarra Interactiva"
                compactMode={compactMode}
                isOpen={panelGuitarOpen}
                onToggle={setPanelGuitarOpen}
              >
                {(() => {
                  const suffixMatch =
                    explorationChord.name.match(/^[A-G](#|b)?(.*)$/);
                  const suffix = suffixMatch ? suffixMatch[2] : "";
                  const positions = getGuitarPositions(
                    explorationChord.root,
                    suffix,
                    explorationChord.isSeventhChord || false,
                  );
                  const currentPosIdx =
                    selectedPositionIdx < positions.length
                      ? selectedPositionIdx
                      : 0;

                  return positions.length > 0 ? (
                    <div
                      className="guitar-view-container"
                      style={{
                        marginTop: "0.5rem",
                        background: "transparent",
                        padding: 0,
                        border: "none",
                      }}
                    >
                      <div
                        className="guitar-header-controls"
                        style={{
                          marginBottom: "0.5rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div className="position-selector">
                          {positions.map((_, idx) => (
                            <button
                              key={idx}
                              className={`pos-btn ${currentPosIdx === idx ? "active" : ""}`}
                              style={{
                                width: "24px",
                                height: "24px",
                                fontSize: "0.75rem",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPositionIdx(idx);
                                const voicing = getGuitarVoicing(
                                  positions[idx],
                                );
                                playGuitarVoicing(voicing);
                              }}
                              aria-label={`Posición ${idx + 1}`}
                            >
                              {idx + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                      <GuitarDiagram
                        position={positions[currentPosIdx]}
                        chordName={explorationChord.name}
                      />

                      <div
                        className="export-controls"
                        style={{ display: "flex", gap: "0.5rem" }}
                      >
                        <p>Esportar acordes:</p>
                        <button
                          className="global-btn"
                          style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                          onClick={() =>
                            exportChordDiagram(
                              explorationChord.name,
                              positions[currentPosIdx],
                              currentPosIdx,
                              "transparent",
                            )
                          }
                          title="Exportar Transparente (PNG)"
                        >
                          Exportar Transparente (PNG)
                        </button>
                        <button
                          className="global-btn"
                          style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                          onClick={() =>
                            exportChordDiagram(
                              explorationChord.name,
                              positions[currentPosIdx],
                              currentPosIdx,
                              "bw",
                            )
                          }
                          title="Exportar Blanco y Negro (PNG)"
                        >
                          Exportar Blanco y Negro (PNG)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-muted text-sm mt-2"
                      style={{ padding: "1rem" }}
                    >
                      Diagrama no disponible
                    </div>
                  );
                })()}
              </CollapsiblePanel>

              {/* Piano Keyboard Visualizer */}
              <CollapsiblePanel
                title="Piano Interactivo"
                compactMode={compactMode}
                isOpen={panelPianoOpen}
                onToggle={setPanelPianoOpen}
              >
                <div
                  className="piano-keyboard-container"
                  style={{ marginTop: 0 }}
                >
                  <div className="piano-labels">
                    <span>Octava 4</span>
                    <span>Octava 5</span>
                  </div>
                  <div className="piano-keys-wrapper">
                    {/* White keys */}
                    <div className="piano-white-keys">
                      {WHITE_KEYS.map((keyNote) => {
                        const active = isKeyActive(keyNote);
                        const keyPC = keyNote.slice(0, -1);
                        return (
                          <div
                            key={keyNote}
                            className={`piano-key-white ${active ? "active" : ""}`}
                            onClick={() => handlePlayKey(keyNote)}
                            title={`Tocar ${keyNote}`}
                          >
                            <span className="key-note-label">{keyPC}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Black keys */}
                    {BLACK_KEYS.map((keyObj) => {
                      const active = isKeyActive(keyObj.note);
                      const keyPC = keyObj.note.slice(0, -1);
                      return (
                        <div
                          key={keyObj.note}
                          className={`piano-key-black ${active ? "active" : ""}`}
                          style={{ left: `${keyObj.left}%` }}
                          onClick={() => handlePlayKey(keyObj.note)}
                          title={`Tocar ${keyObj.note}`}
                        >
                          <span
                            className="key-note-label"
                            style={{ bottom: "4px", fontSize: "0.55rem" }}
                          >
                            {keyPC}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CollapsiblePanel>

            </>
          ) : (
            <CollapsiblePanel
              title="Detalles del Acorde"
              icon={<Music size={20} className="text-purple-400" />}
              compactMode={compactMode}
              isOpen={panelDetailsOpen}
              onToggle={setPanelDetailsOpen}
            >
              <div
                className="empty-state"
                style={{
                  border: "none",
                  background: "transparent",
                  height: "100%",
                }}
              >
                <Music className="empty-state-icon" size={48} />
                <h3>Detalles del Acorde</h3>
                <p>
                  Selecciona un acorde para ver sus notas constitutivas,
                  reproducirlo y visualizarlo en el piano.
                </p>
              </div>
            </CollapsiblePanel>
          )}
        </div>

        <footer className="app-footer">
          <div>
            <strong>Progression Finder</strong> &copy;{" "}
            {new Date().getFullYear()}
          </div>
          <div>
            Desarrollado con React, TypeScript y Tone.js para una experiencia
            auditiva interactiva.
          </div>
          <div>
            Autor Esteban Zen, repositorio{" "}
            <a
              target="_blank"
              href="https://github.com/estebanzen/progression-finder"
            >
              https://github.com/estebanzen/progression-finder
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
