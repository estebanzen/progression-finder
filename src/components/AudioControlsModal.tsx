import { useEffect, type ReactNode } from 'react';
import { Volume2, X } from 'lucide-react';

interface AudioControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const AudioControlsModal = ({
  isOpen,
  onClose,
  children,
}: AudioControlsModalProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="audio-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="audio-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audio-modal-title"
      >
        <div className="audio-modal-header">
          <h2 id="audio-modal-title">
            <Volume2 size={20} />
            Controles de Audio
          </h2>
          <button
            className="audio-modal-close"
            onClick={onClose}
            aria-label="Cerrar controles de audio"
          >
            <X size={20} />
          </button>
        </div>
        <div className="audio-modal-content">{children}</div>
      </section>
    </div>
  );
};
