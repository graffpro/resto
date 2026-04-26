import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Home, ChevronLeft, Smartphone, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/**
 * Slim top bar used by Owner & Admin tile-based dashboards.
 * Replaces the old fixed-left sidebar.
 *
 * Props:
 *   homePath: string                  - route of the tile home (e.g. "/owner" or "/admin")
 *   roleLabel: string                 - shown under app name (e.g. "Owner", "Admin")
 *   accent?: string                   - hex accent color for tags
 *   showApk?: boolean                 - shows APK download chip
 *   extra?: ReactNode                 - extra controls injected before logout (e.g. VoiceCallButton)
 */
export default function DashboardTopBar({
  homePath = '/',
  roleLabel = '',
  accent = '#C05C3D',
  showApk = false,
  extra = null,
}) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === homePath || location.pathname === homePath + '/';

  const downloadApk = () => {
    const link = document.createElement('a');
    link.href = '/qr-restoran.apk';
    link.download = 'qr-restoran.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#1A251E] text-white border-b border-white/10" data-testid="dashboard-topbar">
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-5 h-14 flex items-center gap-2 sm:gap-3">
        {/* Back / Home */}
        {isHome ? (
          <Link
            to={homePath}
            className="flex items-center gap-2.5 group shrink-0"
            data-testid="topbar-home"
          >
            <img
              src="https://static.prod-images.emergentagent.com/jobs/20b3b0d0-a719-4e8b-9738-9b8e7415233b/images/51e072b5ec80fc46021df0d71dbee36c21f565c5904af6647ff4730065da4795.png"
              alt="Logo"
              className="w-8 h-8 rounded-lg"
            />
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-semibold">QR Restoran</p>
              <p className="text-[10px] text-[#8A948D]">{roleLabel}</p>
            </div>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => navigate(homePath)}
            className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-white/10 hover:bg-white/15 transition-colors text-xs font-semibold"
            data-testid="topbar-back"
          >
            <ChevronLeft className="w-4 h-4" />
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('common.home', 'Ana səhifə')}</span>
          </button>
        )}

        {/* User chip */}
        {user && (
          <div className="hidden md:flex items-center gap-2 ml-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
            <div
              className="w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold"
              style={{ background: accent }}
            >
              {user.full_name?.charAt(0)?.toUpperCase() || roleLabel.charAt(0)}
            </div>
            <span className="text-xs font-medium truncate max-w-[120px]">{user.full_name}</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Extra controls (e.g. VoiceCallButton) */}
        {extra}

        {/* APK */}
        {showApk && (
          <button
            type="button"
            onClick={downloadApk}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[11px] font-semibold bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/40 text-emerald-300 hover:from-emerald-600/30 hover:to-teal-600/30 transition-all"
            data-testid="topbar-apk"
          >
            <Smartphone className="w-3.5 h-3.5" />
            APK
            <Download className="w-3 h-3" />
          </button>
        )}

        {/* Language */}
        <LanguageSwitcher variant="dark" />

        {/* Logout */}
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold text-[#C05C3D] hover:bg-white/5 transition-colors"
          data-testid="topbar-logout"
          aria-label={t('common.logout')}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('common.logout')}</span>
        </button>
      </div>
    </header>
  );
}
