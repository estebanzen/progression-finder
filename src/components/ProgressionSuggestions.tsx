import { useState } from 'react';
import type { ChordPlayback } from '../hooks/useChordPlayback';
import type { ContextualChordSuggestion, ProposedProgression, InsertionLocation } from '../utils/contextualChordSuggestions';
import { compatibilityLevel } from '../utils/contextualChordSuggestions';

interface Props {
  suggestions: ContextualChordSuggestion[];
  variants: ProposedProgression[];
  playback: ChordPlayback;
  previewName?: string;
  onPreview: (suggestion: ContextualChordSuggestion) => void;
  onInsert: (symbol: string, index: number) => void;
  onUse: (input: string) => void;
  onUndo: () => void;
  canUndo: boolean;
}
export function ProgressionSuggestions({ suggestions, variants, playback, previewName, onPreview, onInsert, onUse, onUndo, canUndo }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [positions, setPositions] = useState<Record<string, number>>({});
  const visible = showAll ? suggestions : suggestions.slice(0, 6);
  const selectedLocation = (suggestion: ContextualChordSuggestion): InsertionLocation => suggestion.locations.find(location => location.insertIndex === positions[suggestion.chord.name]) ?? suggestion.locations[0];
  return <section className="glass-panel contextual-suggestions" aria-labelledby="contextual-suggestions-title">
    <div className="recommendation-heading"><h2 id="contextual-suggestions-title">Acordes que podés agregar</h2>
      <div className="analyzer-actions">{canUndo && <button onClick={onUndo}>Deshacer inserción</button>}{playback.playing && <button onClick={playback.stop}>Detener reproducción</button>}</div>
    </div>
    <p>Opciones ordenadas por compatibilidad con esta progresión. Elegí un acorde para verlo en guitarra y piano; escuchar no cambia la selección. La puntuación es orientativa y depende de la ubicación.</p>
    {playback.error && <p role="alert">{playback.error}</p>}
    <div id="contextual-recommendations" className="analyzer-grid recommendation-grid">{visible.map(suggestion => {
      const location = selectedLocation(suggestion);
      return <article key={suggestion.chord.name} className={`chord-card recommendation-card ${suggestion.chord.type} ${previewName === suggestion.chord.name ? 'active' : ''}`}>
        <button className="recommendation-select" aria-label={`Ver sugerencia ${suggestion.chord.name} en guitarra y piano`} aria-pressed={previewName === suggestion.chord.name} onClick={() => onPreview(suggestion)}>
          <span className="chord-name">{suggestion.chord.name}</span><span>Ver en guitarra y piano</span>
        </button>
        <p className="chord-notes">{suggestion.notes.join(' – ')}</p><strong>{suggestion.romanNumeral}</strong>
        <span className="recommendation-category">{suggestion.category}</span>
        <span className={`recommendation-confidence ${compatibilityLevel(location.score) === 'Experimental' ? 'experimental' : ''}`}>{compatibilityLevel(location.score)} · {location.score}/100</span>
        <p>{location.reason}</p>
        <label className="recommendation-location"><span>Ubicación recomendada</span>
          {suggestion.locations.length > 1 ? <select aria-label={`Ubicación para ${suggestion.chord.name}`} value={location.insertIndex} onChange={event => setPositions(current => ({ ...current, [suggestion.chord.name]: Number(event.target.value) }))}>
            {suggestion.locations.map(option => <option key={option.insertIndex} value={option.insertIndex}>{option.label}</option>)}
          </select> : <strong>{location.label}</strong>}
        </label>
        <p>{suggestion.resolvesTo ? `Resolución: ${suggestion.resolvesTo}${!location.resolutionPresent ? ' (requiere agregar el destino)' : ''}` : `Enlace siguiente: ${location.resultingProgression[(location.insertIndex + 1) % location.resultingProgression.length].name} (sin resolución obligada)`}</p>
        <p className="recommendation-result"><span>Produce: </span>{location.resultingProgression.map(c => c.name).join(' – ')}</p>
        {previewName === suggestion.chord.name && <p className="suggestion-preview-label">Vista previa · todavía no pertenece a la progresión</p>}
        <div className="analyzer-actions"><button aria-label={`Escuchar sugerencia ${suggestion.chord.name}`} onClick={() => void playback.play([suggestion.chord])}>Escuchar</button><button aria-label={`Agregar ${suggestion.chord.name} acá`} onClick={() => onInsert(suggestion.chord.name, location.insertIndex)}>Agregar acá</button></div>
      </article>;
    })}</div>
    {suggestions.length > 6 && <button className="recommendations-expand" aria-expanded={showAll} aria-controls="contextual-recommendations" onClick={() => setShowAll(value => !value)}>{showAll ? 'Ver menos' : `Ver todas (${suggestions.length})`}</button>}
    <section className="contextual-variants" aria-labelledby="contextual-variants-title"><h3 id="contextual-variants-title">Progresiones propuestas</h3>
      <div className="analyzer-grid">{variants.map((variant, index) => <article className="analyzer-alternative" key={index}>
        <span className="recommendation-confidence">{variant.character}</span><p><strong>{variant.chords.map(c => c.name).join(' – ')}</strong></p><p>{variant.explanation}</p>
        <div className="analyzer-actions"><button onClick={() => void playback.play(variant.chords)}>Escuchar variante {index + 1}</button><button onClick={() => onUse(variant.chords.map(c => c.name).join(' '))}>Usar progresión {index + 1}</button></div>
      </article>)}</div>
    </section>
  </section>;
}
