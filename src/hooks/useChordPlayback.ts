import { useEffect, useRef, useState } from 'react';
import type { ChordInfo } from '../utils/chordTypes';

export function useChordPlayback(onPlay: (chord: ChordInfo) => Promise<void>, onStop: () => void) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const run = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resume = useRef<(() => void) | null>(null);
  const cancel = () => {
    run.current++;
    if (timer.current) clearTimeout(timer.current);
    resume.current?.();
    resume.current = null;
  };
  useEffect(() => () => { cancel(); }, []);
  const stop = () => { cancel(); onStop(); setPlaying(false); };
  const play = async (chords: ChordInfo[], onChord?: (index: number) => void) => {
    stop();
    const id = run.current;
    setPlaying(true);
    setError('');
    try {
      for (let i = 0; i < chords.length; i++) {
        if (id !== run.current) return;
        onChord?.(i);
        await onPlay(chords[i]);
        if (id !== run.current) return;
        await new Promise<void>(resolve => { resume.current = resolve; timer.current = setTimeout(resolve, 2000); });
      }
    } catch { if (id === run.current) setError('No se pudo reproducir. Revisá la carga del instrumento e intentá nuevamente.'); }
    finally { if (id === run.current) setPlaying(false); }
  };
  return { play, stop, playing, error };
}
export type ChordPlayback = ReturnType<typeof useChordPlayback>;
