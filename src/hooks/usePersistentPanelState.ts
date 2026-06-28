import { useState, useEffect } from 'react';

export function usePersistentPanelState(panelKey: string, defaultOpen: boolean = true) {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    const val = localStorage.getItem(panelKey);
    return val !== null ? val === 'true' : defaultOpen;
  });

  useEffect(() => {
    localStorage.setItem(panelKey, String(isOpen));
  }, [isOpen, panelKey]);

  return [isOpen, setIsOpen] as const;
}
