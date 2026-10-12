import { getVoicedNotesForChord } from './utils/chordPlayback';
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as Tone from "tone";
import {
  Music,
  Play,
  Volume2,
  VolumeX,
  Info,
  Sparkles,
  Loader2,
  List,
} from "lucide-react";
import { ChordCard } from "./components/ChordCard";
import { ProgressionAnalyzer } from "./components/ProgressionAnalyzer";
import { ProgressionSuggestions } from "./components/ProgressionSuggestions";
import { useProgression } from "./hooks/useProgression";
import { useChordPlayback } from "./hooks/useChordPlayback";
import { editProgression, insertProgression, type ProgressionState } from "./utils/progressionState";
import { getContextualChordSuggestions, getContextualProgressionVariants, type ContextualChordSuggestion } from "./utils/contextualChordSuggestions";
import { pitchClass } from "./utils/noteSpelling";
import type { ChordInfo } from "./utils/chordTypes";
import { PwaControls } from "./components/PwaControls";
import { CollapsiblePanel } from "./components/CollapsiblePanel";
import { GuitarDiagram, ScaleFretboard } from "./components/GuitarDiagram";
import { AudioControlsModal } from "./components/AudioControlsModal";
import { AppFooter } from "./components/AppFooter";
import { AppHeader } from "./components/AppHeader";
import {
  BLACK_KEYS,
  CHORD_BLACK_KEYS,
  CHORD_WHITE_KEYS,
  WHITE_KEYS,
} from "./utils/pianoKeys";
import { PianoKeyboard } from "./components/PianoKeyboard";
import {
  getGuitarPositions,
  transposeNote,
  getGuitarVoicing,
} from "./utils/guitarChords";
import { exportChordDiagram, exportScaleFretboard } from "./utils/exportDiagram";
import { detectChordFormula, type ChordQuality } from "./utils/chordDetector";
import { usePersistentPanelState } from "./hooks/usePersistentPanelState";
import { useLocalStorage } from "./hooks/useLocalStorage";
import {
  CHROMATIC_NOTES,
  generateScaleNotes,
  SCALE_CATEGORIES,
  SCALE_HARMONY,
  SCALE_PRESETS,
  type ScalePresetId,
} from "./utils/scalePresets";
import "./App.css";

const BASE_URL = import.meta.env.BASE_URL;
// Pitch class map to calculate intervals
const noteToSemits: Record<string, number> = Object.fromEntries(
  ['C', 'D', 'E', 'F', 'G', 'A', 'B'].flatMap(letter => ['', '#', 'b', '##', 'bb'].map(accidental => [letter + accidental, pitchClass(letter + accidental)])),
);

// Normalize input notes (supports C, C#, Db, c, c#, db, etc.)
const normalizeNote = (noteStr: string): string | null => {
  const cleaned = noteStr.trim();
  if (!cleaned) return null;
  const match = cleaned.match(/^([a-gA-G])(#{1,2}|b{1,2})?$/);
  if (!match) return null;
  const base = match[1].toUpperCase();
  const accidental = match[2] ?? "";
  return base + accidental;
};

const formatChordName = (
  root: string,
  suffix: string,
  type: ChordQuality,
  seventh?: string,
) => type === "augmented-major" && seventh
  ? `${root}aug/${seventh}`
  : `${root}${suffix}`;

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
  const progression = useProgression();
  const progressionActive = !!progression.analysis;
  const contextualSuggestions = useMemo(() => progression.analysis ? getContextualChordSuggestions(progression.chords, progression.analysis) : [], [progression.analysis, progression.chords]);
  const contextualVariants = useMemo(() => progression.analysis ? getContextualProgressionVariants(progression.chords, progression.analysis) : [], [progression.analysis, progression.chords]);
  const [insertionHistory, setInsertionHistory] = useState<ProgressionState[]>([]);
  const [rawInput, setRawInput] = useState(() => {
    const queryNotes = new URLSearchParams(window.location.search).get("notes");
    if (queryNotes?.trim()) return queryNotes;
    return localStorage.getItem("current_scale_notes") || "C D E F G A B";
  });
  const [selectedScaleRoot, setSelectedScaleRoot] = useState(() =>
    new URLSearchParams(window.location.search).get("root") ||
    localStorage.getItem("current_scale_root") ||
    "",
  );
  const [manualScalePreset, setSelectedScalePreset] = useState<ScalePresetId>(
    "major",
  );
  const manualNotes = useMemo(() => [...new Set(rawInput.split(/[\s,;]+/).map(normalizeNote).filter((note): note is string => note !== null))], [rawInput]);
  const parsedNotes = progression.detectedScale?.notes ?? manualNotes;
  const selectedScalePreset = progression.detectedScale?.preset ?? manualScalePreset;
  const scaleRoot = progression.detectedScale?.root ?? (parsedNotes.includes(selectedScaleRoot) ? selectedScaleRoot : parsedNotes[0] || "");
  const orderedScaleNotes = useMemo(() => {
    const rootIndex = parsedNotes.indexOf(scaleRoot);
    if (rootIndex <= 0) return parsedNotes;
    return [...parsedNotes.slice(rootIndex), ...parsedNotes.slice(0, rootIndex)];
  }, [parsedNotes, scaleRoot]);
  const activePresetNotes = useMemo(
    () => generateScaleNotes(scaleRoot, selectedScalePreset),
    [scaleRoot, selectedScalePreset],
  );
  const isSelectedPresetActive =
    activePresetNotes.join(" ") === orderedScaleNotes.join(" ");
  const harmonyPresetId = isSelectedPresetActive
    ? SCALE_HARMONY[selectedScalePreset] || null
    : null;
  const harmonyScaleName = harmonyPresetId
    ? SCALE_PRESETS.find((preset) => preset.id === harmonyPresetId)?.name || null
    : null;
  const chordScaleNotes = useMemo(() => {
    if (!harmonyPresetId) return orderedScaleNotes;
    return generateScaleNotes(scaleRoot, harmonyPresetId);
  }, [harmonyPresetId, orderedScaleNotes, scaleRoot]);
  const applyScalePreset = (root: string, presetId: ScalePresetId) => {
    const notes = generateScaleNotes(root, presetId);
    setSelectedScaleRoot(root);
    setSelectedScalePreset(presetId);
    setRawInput(notes.join(" "));
  };
  const [selectedChordName, setSelectedChordName] = useState(() => localStorage.getItem("selected_chord") || "");
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
    if (scaleRoot) localStorage.setItem("current_scale_root", scaleRoot);
  }, [scaleRoot]);

  useEffect(() => {
    const handlePopState = () => {
      const queryNotes = new URLSearchParams(window.location.search).get("notes");
      const queryRoot = new URLSearchParams(window.location.search).get("root");
      setRawInput(
        queryNotes?.trim() ||
          localStorage.getItem("current_scale_notes") ||
          "C D E F G A B",
      );
      setSelectedScaleRoot(queryRoot || "");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    localStorage.setItem("selected_octave", baseOctave.toString());
  }, [baseOctave]);

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
  const [audioModalOpen, setAudioModalOpen] = useState(false);
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
  const [explorationOverride, setExplorationOverride] = useState<{ source: string; chord: ChordInfo; suggestion?: boolean } | null>(null);
  const [positionSelection, setPositionSelection] = useState<{ source: string; index: number } | null>(null);

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

  const getLimiter = useCallback((): Tone.Limiter => {
    if (!limiterRef.current) {
      limiterRef.current = new Tone.Limiter(-1.5).toDestination();
    }
    return limiterRef.current;
  }, []);

  const loadInstrument = useCallback(function loadInstrument(instType: InstrumentType) {
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
  }, [getLimiter]);

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
    loadInstrument(activeInstrumentRef.current);
    const samplers = samplersRef.current;
    return () => {
      Object.values(samplers).forEach((s) => s?.dispose());
      limiterRef.current?.dispose();
    };
  }, [loadInstrument]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (parsedNotes.length > 0) {
      url.searchParams.set("notes", parsedNotes.join(","));
      url.searchParams.set("root", scaleRoot);
    } else {
      url.searchParams.delete("notes");
      url.searchParams.delete("root");
    }
    if (url.href !== window.location.href) window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [parsedNotes, scaleRoot]);

  // Build diatonic triads or seventh chords when parsed notes or mode changes
  const scaleChords = useMemo(() => {
    const N = chordScaleNotes.length;
    const canBuildSevenths = showSevenths && N >= 7;
    const minNotes = canBuildSevenths ? 4 : 3;
    if (N < minNotes) {
      return [];
    }

    const detectedChords: ChordInfo[] = [];

    for (let i = 0; i < N; i++) {
      const root = chordScaleNotes[i];
      const third = chordScaleNotes[(i + 2) % N];
      const fifth = chordScaleNotes[(i + 4) % N];

      const rSem = noteToSemits[root] ?? 0;
      const tSem = noteToSemits[third] ?? 0;
      const fSem = noteToSemits[fifth] ?? 0;

      const interval3 = (tSem - rSem + 12) % 12;
      const interval5 = (fSem - rSem + 12) % 12;

      if (canBuildSevenths) {
        const seventh = chordScaleNotes[(i + 6) % N];
        const sSem = noteToSemits[seventh] ?? 0;
        const interval7 = (sSem - rSem + 12) % 12;

        const formula = detectChordFormula([interval3, interval5, interval7]);
        const type = formula.quality;
        const suffix = formula.suffix;

        const name = formatChordName(root, suffix, type, seventh);
        const voicedNotes = getVoicedNotesseventh(root, third, fifth, seventh);

        detectedChords.push({
          root,
          third,
          fifth,
          seventh,
          type,
          suffix,
          name,
          notes: [root, third, fifth, seventh],
          voicedNotes,
          isSeventhChord: true,
        });
      } else {
        const formula = detectChordFormula([interval3, interval5]);
        const type = formula.quality;
        const suffix = formula.suffix;

        const name = formatChordName(root, suffix, type);
        const voicedNotes = getVoicedNotes(root, third, fifth);

        detectedChords.push({
          root,
          third,
          fifth,
          type,
          suffix,
          name,
          notes: [root, third, fifth],
          voicedNotes,
          isSeventhChord: false,
        });
      }
    }

    return detectedChords;
  }, [chordScaleNotes, showSevenths]);

  const chords = progressionActive ? progression.chords : scaleChords;
  const selectedChord = progressionActive ? progression.selectedChord : chords.find(c => c.name === selectedChordName) ?? chords[0] ?? null;
  const selectionSource = `${progressionActive ? progression.state.input + ':' + progression.state.selectedIndex : rawInput + ':' + showSevenths}:${selectedChord?.name ?? ''}`;
  const explorationChord = explorationOverride?.source === selectionSource ? explorationOverride.chord : selectedChord;
  const positionSource = `${selectionSource}:${explorationChord?.name ?? ''}`;
  const selectedPositionIdx = positionSelection?.source === positionSource ? positionSelection.index : 0;
  const setSelectedPositionIdx = (index: number) => setPositionSelection({ source: positionSource, index });
  const setExplorationChord = (chord: ChordInfo) => setExplorationOverride({ source: selectionSource, chord });
  const selectProgressionChord = (index: number) => {
    progression.setState(state => ({ ...state, selectedIndex: index }));
    setExplorationOverride(null);
    setPositionSelection(null);
  };
  const setSelectedChord = (chord: ChordInfo) => {
    setSelectedChordName(chord.name);
    if (progressionActive) {
      const index = progression.chords.findIndex(c => c === chord || c.name === chord.name);
      if (index >= 0) selectProgressionChord(index);
    }
    setExplorationOverride(null);
    setPositionSelection(null);
  };
  useEffect(() => {
    if (selectedChord && localStorage.getItem("selected_chord") !== selectedChord.name) localStorage.setItem("selected_chord", selectedChord.name);
  }, [selectedChord]);

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

  const playback = useChordPlayback(async chord => {
    const sampler = samplersRef.current[activeInstrumentRef.current];
    if (!sampler?.loaded) throw new Error('Instrumento no disponible');
    await triggerNotes(getVoicedNotesForChord(chord, baseOctave));
  }, () => samplersRef.current[activeInstrumentRef.current]?.releaseAll());
  const changeProgression = (input: string) => { playback.stop(); progression.setState(editProgression(input)); setExplorationOverride(null); setInsertionHistory([]); };
  const addProgressionChord = (symbol: string, index: number) => {
    playback.stop();
    setInsertionHistory(history => [...history, progression.state]);
    progression.setState(state => insertProgression(state, symbol, index));
    setExplorationOverride(null);
    setPositionSelection(null);
  };
  const undoInsertion = () => {
    const previous = insertionHistory.at(-1);
    if (!previous) return;
    playback.stop();
    progression.setState(previous);
    setInsertionHistory(history => history.slice(0, -1));
    setExplorationOverride(null);
    setPositionSelection(null);
  };
  const previewSuggestion = (suggestion: ContextualChordSuggestion) => {
    playback.stop();
    setExplorationOverride({ source: selectionSource, chord: suggestion.chord, suggestion: true });
    setPositionSelection(null);
    setPanelGuitarOpen(true);
    setPanelPianoOpen(true);
  };
  const previewName = explorationOverride?.source === selectionSource && explorationOverride.suggestion ? explorationOverride.chord.name : undefined;

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

    const suffix = explorationChord.suffix;
    const newName = formatChordName(
      newRoot,
      suffix,
      explorationChord.type,
      newSeventh,
    );

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
    const suffix = explorationChord.suffix;
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

  const isKeyRoot = (keyNote: string): boolean => {
    if (!explorationChord) return false;
    const keyPitchClass = keyNote.replace(/\d+$/, "");
    return noteToSemits[keyPitchClass] === noteToSemits[explorationChord.root];
  };

  const isScaleKeyActive = (keyNote: string): boolean => {
    if (manuallyPressedKeys[keyNote]) return true;
    const keyPitchClass = keyNote.replace(/\d+$/, "");
    return parsedNotes.some(
      (note) => noteToSemits[note] === noteToSemits[keyPitchClass],
    );
  };

  const isScaleKeyRoot = (keyNote: string): boolean => {
    const keyPitchClass = keyNote.replace(/\d+$/, "");
    return noteToSemits[keyPitchClass] === noteToSemits[scaleRoot];
  };

  return (
    <div className="app-shell">
      <AppHeader
        compactMode={compactMode}
        onToggleCompactMode={() => setCompactMode(!compactMode)}
        onOpenAudioSettings={() => setAudioModalOpen(true)}
      />

      <main className="container">
        <PwaControls />
        <ProgressionAnalyzer compactMode={compactMode} input={progression.state.input} errors={progression.errors}
          analysis={progression.analysis} pendingKey={progression.pendingKey} selectedIndex={previewName ? -1 : progression.state.selectedIndex}
          onChange={changeProgression} onSelect={selectProgressionChord} playback={playback}
          onChooseKey={key => { playback.stop(); progression.setState(state => ({ ...state, keyChoice: { tonic: key.tonic, mode: key.mode } })); }} />
        {progression.analysis && <ProgressionSuggestions key={progression.state.input + progression.analysis.key.name}
          suggestions={contextualSuggestions} variants={contextualVariants} playback={playback} previewName={previewName}
          onPreview={previewSuggestion} onInsert={addProgressionChord} onUse={changeProgression} onUndo={undoInsertion} canUndo={insertionHistory.length > 0} />}
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
                  value={progression.detectedScale ? parsedNotes.join(" ") : rawInput}
                  readOnly={!!progression.detectedScale}
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
                    <span
                      key={`${note}-${idx}`}
                      className={`note-badge ${note === scaleRoot ? "root" : ""}`}
                      title={note === scaleRoot ? "Nota raíz" : undefined}
                    >
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
              <div className="scale-preset-controls">
                <label>
                  <span>Nota raíz</span>
                  <select
                    value={scaleRoot}
                    disabled={!!progression.detectedScale}
                    onChange={(event) =>
                      applyScalePreset(event.target.value, selectedScalePreset)
                    }
                    aria-label="Seleccionar nota raíz de la escala"
                  >
                    {[...new Set([...CHROMATIC_NOTES, 'Db', 'Eb', 'Gb', 'Ab', 'Bb', scaleRoot].filter(Boolean))].map((note) => (
                      <option key={note} value={note}>{note}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Tipo de escala</span>
                  <select
                    value={selectedScalePreset}
                    disabled={!!progression.detectedScale}
                    onChange={(event) =>
                      applyScalePreset(scaleRoot || "C", event.target.value as ScalePresetId)
                    }
                    aria-label="Seleccionar tipo de escala"
                  >
                    {SCALE_CATEGORIES.map((category) => (
                      <optgroup key={category} label={category}>
                        {SCALE_PRESETS.filter(
                          (preset) => preset.category === category,
                        ).map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {scaleRoot || "C"} {preset.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
              </div>
              {harmonyScaleName && (
                <p className="preset-harmony-help">
                  Los acordes se derivan de la escala {scaleRoot} {harmonyScaleName};
                  los instrumentos conservan las notas de la escala seleccionada.
                </p>
              )}
              {isSelectedPresetActive && selectedScalePreset === "whole-tone" && (
                <p className="preset-harmony-help">
                  La escala de tonos enteros genera tríadas aumentadas. El modo de
                  séptimas no se aplica porque la escala tiene seis grados.
                </p>
              )}
            </section>
          </div>
        </CollapsiblePanel>

        {/* Audio controls modal */}
        <AudioControlsModal
          isOpen={audioModalOpen}
          onClose={() => setAudioModalOpen(false)}
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
        </AudioControlsModal>

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
          {!progressionActive && (
          <CollapsiblePanel
            title="Acordes de la Escala"
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

          )}
          {/* Chord visualizers */}
          {explorationChord ? (
            <>
              {panelDetailsOpen && !progressionActive && (
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
                          {explorationChord!.name}
                        </div>
                        <div className="detail-chord-type">
                          {explorationChord!.isSeventhChord
                            ? "Séptima"
                            : "Tríada"}{" "}
                          {explorationChord!.type === "halfdiminished"
                            ? "Half-Diminished"
                            : explorationChord!.type === "dominant"
                              ? "Dominante"
                              : explorationChord!.type === "unknown"
                                ? "No estándar"
                                : explorationChord!.type === "suspended" ? explorationChord!.suffix.toUpperCase() : explorationChord!.type}
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
                      className={`notes-breakdown ${explorationChord!.isSeventhChord ? "four-notes" : ""}`}
                    >
                      <div className="breakdown-card">
                        <div className="breakdown-label">Tónica</div>
                        <div className="breakdown-value">
                          {explorationChord!.root}
                        </div>
                      </div>
                      <div className="breakdown-card">
                        <div className="breakdown-label">{explorationChord!.type === "suspended" ? explorationChord!.suffix === "sus2" ? "Segunda" : "Cuarta" : "Tercera"}</div>
                        <div className="breakdown-value">
                          {explorationChord!.third}
                        </div>
                      </div>
                      <div className="breakdown-card">
                        <div className="breakdown-label">Quinta</div>
                        <div className="breakdown-value">
                          {explorationChord!.fifth}
                        </div>
                      </div>
                      {explorationChord!.isSeventhChord &&
                        explorationChord!.seventh && (
                          <div className="breakdown-card">
                            <div className="breakdown-label">Séptima</div>
                            <div className="breakdown-value">
                              {explorationChord!.seventh}
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
              )}
              {/* Guitar View */}
              <CollapsiblePanel
                title="Guitarra Interactiva"
                compactMode={compactMode}
                isOpen={panelGuitarOpen}
                onToggle={setPanelGuitarOpen}
              >
                {(() => {
                  const suffix = explorationChord.suffix;
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
                      {previewName && <p className="suggestion-preview-label" role="status">Vista previa: {previewName} · sugerencia, todavía no pertenece a la progresión</p>}
                      <div
                        className="guitar-header-controls"
                        style={{
                          marginBottom: "0.5rem",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <span className="guitar-control-label">Posición acordes</span>
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
                      <div className="guitar-visuals">
                          <GuitarDiagram
                            position={positions[currentPosIdx]}
                            chordName={explorationChord.name}
                            rootNote={explorationChord.root}
                          />
                        <ScaleFretboard notes={parsedNotes} rootNote={scaleRoot} />
                      </div>

                      <div className="guitar-export-container">
                        <div className="export-controls">
                          <p>Exportar acordes:</p>
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
                      <div className="scale-export-container">
                        <div className="export-controls">
                          <p>Exportar escala:</p>
                          <button
                            className="global-btn"
                            style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            onClick={() =>
                              exportScaleFretboard(parsedNotes, "transparent")
                            }
                          >
                            Exportar Transparente (PNG)
                          </button>
                          <button
                            className="global-btn"
                            style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            onClick={() => exportScaleFretboard(parsedNotes, "bw")}
                          >
                            Exportar Blanco y Negro (PNG)
                          </button>
                        </div>
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
                <div className="piano-split-view">
                  <section className="piano-chord-section">
                    {previewName && <p className="suggestion-preview-label">Sugerencia · vista previa</p>}
                    <div className="piano-section-heading">
                      <span>Acorde</span>
                      <strong>{explorationChord?.name || "—"}</strong>
                    </div>
                    <PianoKeyboard
                      whiteKeys={CHORD_WHITE_KEYS}
                      noteLabels={explorationChord.notes}
                      blackKeys={CHORD_BLACK_KEYS}
                      isActive={(note) =>
                        manuallyPressedKeys[note] ||
                        Boolean(
                          explorationChord?.notes.some(
                            (chordNote) =>
                              noteToSemits[chordNote] ===
                              noteToSemits[note.replace(/\d+$/, "")],
                          ),
                        )
                      }
                      isRoot={isKeyRoot}
                      onPlay={handlePlayKey}
                      compact
                    />
                  </section>

                  <section className="piano-scale-section">
                    <div className="piano-section-heading">
                      <span>Escala en el piano</span>
                      <small>Octavas 4–5</small>
                    </div>
                    <PianoKeyboard
                      whiteKeys={WHITE_KEYS}
                      noteLabels={parsedNotes}
                      blackKeys={BLACK_KEYS}
                      isActive={isScaleKeyActive}
                      isRoot={isScaleKeyRoot}
                      onPlay={handlePlayKey}
                    />
                  </section>
                </div>
              </CollapsiblePanel>

            </>
          ) : (
            panelDetailsOpen && !progressionActive && (
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
            )
          )}
        </div>

      </main>
      <AppFooter />
    </div>
  );
}

export default App;
