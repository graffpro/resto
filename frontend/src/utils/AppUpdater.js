import { useEffect, useState } from 'react';
import { isNativeApp } from './capacitor';
import { Download, X } from 'lucide-react';

const APP_VERSION = '1.0.0';
const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;

export default function AppUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState('');

  useEffect(() => {
    if (!isNativeApp) return;
    
    const checkUpdate = async () => {
      try {
        const res = await fetch(`${API}/app-version`);
        const data = await res.json();
        if (data.version && data.version !== APP_VERSION) {
          setNewVersion(data.version);
          setUpdateAvailable(true);
        }
      } catch {}
    };

    // Check on start and every 30 minutes
    checkUpdate();
    const interval = setInterval(checkUpdate, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!updateAvailable) return null;

  const handleUpdate = () => {
    window.open('/qr-restoran.apk', '_system');
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[200] bg-emerald-600 text-white rounded-2xl p-4 shadow-2xl shadow-emerald-900/50 flex items-center justify-between" data-testid="app-update-banner">
      <div className="flex items-center gap-3">
        <Download className="w-5 h-5 animate-bounce" />
        <div>
          <p className="text-sm font-bold">Yeni versiya: v{newVersion}</p>
          <p className="text-[10px] text-emerald-100">Yeniləyin</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handleUpdate} className="bg-white text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold active:scale-95">
          Yenilə
        </button>
        <button onClick={() => setUpdateAvailable(false)} className="p-1.5 text-emerald-200 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
