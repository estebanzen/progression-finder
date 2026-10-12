import type { ProgressionAnalysis, Key } from '../utils/progressionAnalyzer';
import type { ChordPlayback } from '../hooks/useChordPlayback';
import { CollapsiblePanel } from './CollapsiblePanel';

interface Props {
  input: string; errors: string[]; analysis: ProgressionAnalysis | null; pendingKey: boolean; selectedIndex: number;
  onChange: (value: string) => void; onSelect: (index: number) => void; onChooseKey: (key: Key) => void;
  playback: ChordPlayback; compactMode?: boolean;
}
export function ProgressionAnalyzer({ input, errors, analysis, pendingKey, selectedIndex, onChange, onSelect, onChooseKey, playback, compactMode }: Props) {
  return <CollapsiblePanel title="Analizador de progresiones" defaultOpen compactMode={compactMode} onToggle={open => { if (!open) playback.stop(); }}>
    <div className="progression-analyzer">
      <label htmlFor="progression-input">Progresión con símbolos de acordes</label>
      <input id="progression-input" value={input} placeholder="Ej: Gm C Fmaj7 D7" aria-describedby="progression-help progression-errors" aria-invalid={errors.length > 0} onChange={event => onChange(event.target.value)} />
      <p id="progression-help">Separá los acordes con espacios, comas o guiones.</p>
      <div id="progression-errors" role="status">{errors.map((error, i) => <p key={i}>{error}</p>)}</div>
      {playback.error && <p role="alert">{playback.error}</p>}
      {!input.trim() && <p>Ingresá una progresión para analizarla y explorarla en guitarra y piano.</p>}
      {analysis && <>
        <div className="analyzer-summary" aria-live="polite">
          <h3>Tonalidad {pendingKey ? 'probable' : 'principal'}: {analysis.key.name}</h3>
          <p className="analyzer-degrees">{analysis.harmony.map(h => h.roman).join(' – ')}</p>
          <p>Confianza {analysis.confidence.toLowerCase()} (estimación heurística).</p><p>{analysis.explanation}</p>
          <p>Otras lecturas: {analysis.alternativesKeys.map(key => key.name).join(', ')}.</p>
          {pendingKey && <div className="analyzer-key-choice"><p>La lectura es ambigua. La escala actual se conserva hasta que elijas una tonalidad. Las opciones se ordenan por puntuación armónica; los empates usan un orden estable.</p>
            <div className="analyzer-actions">{[analysis.key, ...analysis.alternativesKeys].map(key => <button key={`${key.tonic}-${key.mode}`} onClick={() => onChooseKey(key)}>Usar {key.name}</button>)}</div>
          </div>}
        </div>
        <section aria-labelledby="progression-chords-title">
          <h3 id="progression-chords-title">Acordes de la progresión</h3>
          <div className="analyzer-actions"><button onClick={() => void playback.play(analysis.harmony.map(h => h.chord), onSelect)} disabled={playback.playing}>Escuchar progresión</button><button onClick={playback.stop} disabled={!playback.playing}>Detener</button></div>
          <div className="analyzer-grid progression-chords">{analysis.harmony.map((h, i) => <button type="button" key={i}
            className={`chord-card progression-chord ${h.chord.type} ${selectedIndex === i ? 'active' : ''}`}
            aria-pressed={selectedIndex === i} aria-label={`Seleccionar y escuchar ${h.chord.name}, ${h.roman}`}
            onClick={() => { onSelect(i); void playback.play([h.chord]); }}>
            <span className="chord-name">{h.chord.name}</span>{h.chord.type === 'suspended' && <span className="chord-type-badge">{h.chord.suffix.toUpperCase()}</span>}<span className="chord-notes">{h.chord.notes.join(' – ')}</span><strong>{h.roman}</strong>
            <span>{h.diatonic ? 'Diatónico' : h.category}</span>{h.resolvesTo && <span>Resuelve hacia {h.resolvesTo}</span>}
            <span className="progression-selection">{selectedIndex === i ? 'Seleccionado' : 'Seleccionar y escuchar'}</span>
          </button>)}</div>
        </section>
      </>}
    </div>
  </CollapsiblePanel>;
}
