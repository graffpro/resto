import { Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Store, Sparkles, Settings } from 'lucide-react';
import DashboardTopBar from '@/components/layouts/DashboardTopBar';
import TileHome from '@/components/layouts/TileHome';
import RestaurantsPage from './RestaurantsPage';
import SettingsPage from './SettingsPage';
import PartnersPage from './PartnersPage';

function OwnerHome() {
  const { t } = useTranslation();
  const tiles = [
    {
      to: '/owner/restaurants',
      label: t('nav.restaurants'),
      subtitle: t('owner_panel.title', 'Owner Panel'),
      Icon: Store,
      color: '#C05C3D', // brand orange
      size: 'md',
      testid: 'tile-restaurants',
    },
    {
      to: '/owner/partners',
      label: t('nav.partners'),
      subtitle: 'Featured',
      Icon: Sparkles,
      color: '#8B5CF6', // violet
      size: 'sm',
      testid: 'tile-partners',
    },
    {
      to: '/owner/settings',
      label: t('common.settings'),
      subtitle: 'System',
      Icon: Settings,
      color: '#0EA5E9', // sky
      size: 'sm',
      testid: 'tile-settings',
    },
  ];
  return (
    <div className="px-3 sm:px-5 py-6 max-w-screen-2xl mx-auto">
      <TileHome
        tiles={tiles}
        title={t('owner_panel.title', 'Owner Panel')}
        subtitle={t('owner_panel.subtitle', 'Restoranları və partnyorları idarə edin')}
      />
    </div>
  );
}

function SubPageWrap({ children }) {
  return <div className="px-3 sm:px-5 py-6 max-w-screen-2xl mx-auto">{children}</div>;
}

export default function OwnerDashboard() {
  return (
    <div className="min-h-screen bg-[#F4F5F2]">
      <DashboardTopBar homePath="/owner" roleLabel="Owner" />
      <Routes>
        <Route path="/" element={<OwnerHome />} />
        <Route path="/restaurants" element={<SubPageWrap><RestaurantsPage /></SubPageWrap>} />
        <Route path="/partners" element={<SubPageWrap><PartnersPage /></SubPageWrap>} />
        <Route path="/settings" element={<SubPageWrap><SettingsPage /></SubPageWrap>} />
      </Routes>
    </div>
  );
}
