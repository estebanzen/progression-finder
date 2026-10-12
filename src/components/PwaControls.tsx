import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export function PwaControls() {
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState('');
  const { offlineReady: [offlineReady, setOfflineReady], needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisterError: () => setError('No se pudo preparar el modo sin conexión. Intentá recargar cuando tengas conexión.'),
  });
  useEffect(() => {
    const available = (event: Event) => { event.preventDefault(); setInstall(event as InstallPrompt); };
    const installed = () => setInstall(null);
    window.addEventListener('beforeinstallprompt', available);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', available);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);
  const installApp = async () => {
    if (!install) return;
    setInstalling(true);
    setError('');
    try { await install.prompt(); await install.userChoice; }
    catch { setError('No se pudo instalar. Intentá desde el menú del navegador.'); }
    finally { setInstalling(false); setInstall(null); }
  };
  if (!install && !offlineReady && !needRefresh && !error) return null;
  return <aside className="pwa-controls" aria-label="Instalación y actualizaciones">
    <div role="status">{error || (needRefresh ? 'Hay una nueva versión disponible.' : offlineReady ? 'App e instrumentos listos para usar sin conexión.' : 'Instalá ProgressionFinder para abrirlo como una app.')}</div>
    <div className="pwa-actions">
      {install && <button disabled={installing} onClick={() => void installApp()}>{installing ? 'Instalando…' : 'Instalar app'}</button>}
      {needRefresh && <button onClick={() => void updateServiceWorker(true).catch(() => setError('No se pudo actualizar. Intentá nuevamente.'))}>Actualizar ahora</button>}
      {(offlineReady || needRefresh || error) && <button onClick={() => { setOfflineReady(false); setNeedRefresh(false); setError(''); }}>Cerrar aviso</button>}
    </div>
  </aside>;
}
