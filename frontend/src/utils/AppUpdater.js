import { useEffect, useState } from 'react';
import { isNativeApp } from './capacitor';
import { Download, Loader2 } from 'lucide-react';

const APP_VERSION = '1.1.0';
const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;

export default function AppUpdater() {
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!isNativeApp) return;

    const checkAndUpdate = async () => {
      try {
        const res = await fetch(`${API}/app-version`);
        const data = await res.json();
        if (data.version && data.version !== APP_VERSION) {
          // Auto-trigger download
          setUpdating(true);
          setStatus(`v${data.version} yüklənir...`);

          // Trigger download via hidden link
          setTimeout(() => {
            const baseUrl = window.location.origin;
            const link = document.createElement('a');
            link.href = `${baseUrl}/qr-restoran.apk`;
            link.download = 'qr-restoran.apk';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Also try location change as fallback
            setTimeout(() => {
              setStatus('Bildirişlərdən quraşdırın');
              setTimeout(() => setUpdating(false), 5000);
            }, 2000);
          }, 1000);
        }
      } catch {
        setUpdating(false);
      }
    };

    checkAndUpdate();
  }, []);

  if (!updating) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-[#1A251E] flex flex-col items-center justify-center p-6" data-testid="app-updating-screen">
      <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-6" />
      <h2 className="text-xl font-bold text-white mb-2">Yeniləmə</h2>
      <p className="text-sm text-emerald-300 mb-4">{status}</p>
      <p className="text-xs text-white/40 text-center">
        Yükləmə tamamlandıqdan sonra bildirişlərdən APK faylını açıb quraşdırın
      </p>
      <button
        onClick={() => setUpdating(false)}
        className="mt-8 text-xs text-white/30 underline"
      >
        Keç (sonra yenilə)
      </button>
    </div>
  );
}
