import React from 'react';
import type { ChordInfo } from '../App';

interface ChordCardProps {
  chord: ChordInfo;
  isSelected: boolean;
  onPlay: (chord: ChordInfo) => void;
}

export const ChordCard: React.FC<ChordCardProps> = ({
  chord,
  isSelected,
  onPlay
}) => {
  const badgeLabel = chord.type === 'halfdiminished' ? 'half-dim' : chord.type === 'dominant' ? 'dom7' : chord.type === 'unknown' ? 'otro' : chord.type;
  
  return (
    <div 
      className={`chord-card ${chord.type} ${isSelected ? 'active' : ''}`}
      onClick={() => onPlay(chord)}
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <div className="chord-name">{chord.name}</div>
      <span className="chord-type-badge">{badgeLabel}</span>
      <div className="chord-notes" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
        {chord.notes.join(' – ')}
      </div>
    </div>
  );
};
