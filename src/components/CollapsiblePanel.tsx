import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsiblePanelProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  children: React.ReactNode;
  compactMode?: boolean;
  className?: string;
  headerControls?: React.ReactNode;
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  title,
  icon,
  defaultOpen = true,
  isOpen: controlledIsOpen,
  onToggle,
  children,
  compactMode = false,
  className = '',
  headerControls,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    const newValue = !isOpen;
    if (!isControlled) {
      setInternalIsOpen(newValue);
    }
    if (onToggle) {
      onToggle(newValue);
    }
  };

  return (
    <section className={`glass-panel collapsible-panel ${compactMode ? 'compact' : ''} ${className}`}>
      <div 
        className="panel-header" 
        onClick={handleToggle}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isOpen && !compactMode ? '1rem' : '0' }}
      >
        <h2 style={{ marginBottom: 0, fontSize: compactMode ? '1.1rem' : '1.5rem' }}>
          {icon && <span style={{ marginRight: '0.5rem' }}>{icon}</span>}
          {title}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} onClick={(e) => e.stopPropagation()}>
          {headerControls && <div className="panel-header-controls">{headerControls}</div>}
          <button
            onClick={handleToggle}
            className="panel-toggle-btn"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
          >
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>
      
      {isOpen && (
        <div className="panel-content">
          {children}
        </div>
      )}
    </section>
  );
};
