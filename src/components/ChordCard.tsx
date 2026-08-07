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
  const badgeLabels: Record<ChordInfo['type'], string> = {
    major: 'major',
    minor: 'minor',
    diminished: 'diminished',
    dominant: 'dom7',
    halfdiminished: 'half-dim',
    augmented: 'augmented',
    'minor-major': 'minj7',
    'augmented-major': 'maj7#5',
    suspended: 'suspended',
    unknown: 'otro',
  };
  const badgeLabel = badgeLabels[chord.type];
  
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
