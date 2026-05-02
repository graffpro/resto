import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, Flame, Truck, Bell, Users, DollarSign } from 'lucide-react';

/**
 * LiveStatsHero — vibrant, animated hero row shown above the Metro tiles.
 * Shows 4 key real-time KPIs in big gradient cards with subtle pulse + scroll-up
 * animation when values change. Use above AdminHome tiles.
 *
 * Props:
 *   stats: {
 *     today_revenue: number,     // AZN
 *     active_orders: number,
 *     pending_delivery: number,
 *     waiter_calls: number,
 *     active_tables: number,
 *     reservations_today: number,
 *   }
 */

function pulse() {
  return 'animate-[pulseGlow_2.4s_ease-in-out_infinite]';
}

// Count-up number hook — smoothly animates from old to new value.
function useCountUp(value, duration = 650) {
  const [display, setDisplay] = useState(value || 0);
  useEffect(() => {
    if (value === undefined || value === null) return;
    const from = display;
    const to = Number(value) || 0;
    if (from === to) return;
    const start = performance.now();
    let rafId;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) rafId = requestAnimationFrame(tick);
      else setDisplay(to);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return display;
}

function fmtMoney(v) {
  const n = Number(v) || 0;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return Math.round(n).toLocaleString('az-AZ');
}

function StatCard({ kind, value, label, caption, Icon, gradient, accent, shadow, testid }) {
  const animated = useCountUp(value ?? 0);
  const displayValue = kind === 'money' ? fmtMoney(animated) : Math.round(animated).toLocaleString('az-AZ');
  const isHot = (Number(value) || 0) > 0;

  return (
    <div
      data-testid={testid}
      className="relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white transition-transform duration-300 hover:-translate-y-1"
      style={{ background: gradient, boxShadow: shadow }}
    >
      {/* Decorative radial highlight */}
      <div
        className="pointer-events-none absolute -top-12 -right-10 w-48 h-48 rounded-full opacity-40 blur-2xl"
        style={{ background: `radial-gradient(circle, ${accent}cc 0%, transparent 70%)` }}
      />
      {/* Grain */}
      <div
        className="absolute inset-0 opacity-[0.09] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      <div className="relative flex items-start justify-between">
        <div
          className={`w-11 h-11 rounded-2xl grid place-items-center backdrop-blur-sm ${isHot ? pulse() : ''}`}
          style={{ background: 'rgba(255,255,255,0.22)' }}
        >
          {Icon && <Icon className="w-5 h-5" strokeWidth={2.4} />}
        </div>
        {isHot && (
          <span className="text-[10px] font-black uppercase tracking-[0.18em] bg-white/25 backdrop-blur-sm px-2.5 py-1 rounded-full">
            ● LIVE
          </span>
        )}
      </div>

      <div className="relative mt-5 sm:mt-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight drop-shadow-sm tabular-nums">
            {displayValue}
          </span>
          {kind === 'money' && <span className="text-xl font-black opacity-90">₼</span>}
        </div>
        <p className="mt-1 text-sm font-bold uppercase tracking-wider opacity-95">{label}</p>
        {caption && (
          <p className="mt-0.5 text-[11px] font-medium opacity-75">{caption}</p>
        )}
      </div>
    </div>
  );
}

export default function LiveStatsHero({ stats = {} }) {
  const cards = useMemo(() => ([
    {
      kind: 'money',
      testid: 'stat-revenue',
      value: stats.today_revenue || 0,
      label: 'Bu günkü gəlir',
      caption: 'Emal olunan sifarişlər',
      Icon: DollarSign,
      gradient: 'linear-gradient(135deg, #065F46 0%, #10B981 55%, #34D399 100%)',
      accent: '#6EE7B7',
      shadow: '0 20px 40px -12px rgba(16,185,129,0.45)',
    },
    {
      kind: 'count',
      testid: 'stat-active-orders',
      value: stats.pending_orders || 0,
      label: 'Aktiv sifariş',
      caption: `${stats.active_tables || 0} açıq masa`,
      Icon: Flame,
      gradient: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 50%, #F59E0B 100%)',
      accent: '#FDBA74',
      shadow: '0 20px 40px -12px rgba(220,38,38,0.5)',
    },
    {
      kind: 'count',
      testid: 'stat-delivery',
      value: stats.pending_delivery || 0,
      label: 'Çatdırılma gözləyən',
      caption: 'Saytdan gələn sifarişlər',
      Icon: Truck,
      gradient: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 50%, #60A5FA 100%)',
      accent: '#BFDBFE',
      shadow: '0 20px 40px -12px rgba(59,130,246,0.45)',
    },
    {
      kind: 'count',
      testid: 'stat-reservations',
      value: stats.reservations_today || 0,
      label: 'Bu günkü rezerv',
      caption: 'Təsdiq gözləyənlər daxil',
      Icon: Users,
      gradient: 'linear-gradient(135deg, #581C87 0%, #9333EA 55%, #D946EF 100%)',
      accent: '#F5D0FE',
      shadow: '0 20px 40px -12px rgba(147,51,234,0.45)',
    },
  ]), [stats]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6" data-testid="live-stats-hero">
      {cards.map((c) => <StatCard key={c.testid} {...c} />)}
    </div>
  );
}
