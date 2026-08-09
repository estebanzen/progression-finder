import { Maximize2, Minimize2, Music, Settings } from 'lucide-react';

interface AppHeaderProps {
  compactMode: boolean;
  onToggleCompactMode: () => void;
  onOpenAudioSettings: () => void;
}

export const AppHeader = ({
  compactMode,
  onToggleCompactMode,
  onOpenAudioSettings,
}: AppHeaderProps) => (
  <header className="app-navbar">
    <div className="app-navbar__inner">
      <div className="app-brand">
        <div className="logo-icon">
          <Music size={24} aria-hidden="true" />
        </div>
        <span>Progression Finder</span>
      </div>
      <div className="navbar-actions">
        <button
          className="global-btn audio-settings-btn"
          onClick={onOpenAudioSettings}
          aria-label="Abrir controles de audio"
          title="Controles de Audio"
        >
          <Settings size={17} />
          <span>Audio</span>
        </button>
        <button
          className={`global-btn ${compactMode ? 'active' : ''}`}
          onClick={onToggleCompactMode}
          aria-label="Alternar modo compacto"
        >
          {compactMode ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          <span>Modo compacto</span>
        </button>
      </div>
    </div>
  </header>
);
