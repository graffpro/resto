import { Link } from 'react-router-dom';

/**
 * Modern Metro-tile homepage grid (inspired by ERP12 / Windows Modern UI).
 * - Vibrant solid colors per category
 * - Soft gradient overlay + grain texture for depth
 * - Hover lifts the tile and reveals a glow ring
 * - Big icon top-left, large bold label bottom-left
 *
 * Props:
 *   tiles: Array<{
 *     to: string,            // route or external link
 *     label: string,         // big bottom label
 *     subtitle?: string,     // small caption above label
 *     Icon: LucideIcon,      // lucide-react icon component
 *     color: string,         // hex / tailwind-bg-class for the tile bg (use hex for inline)
 *     accent?: string,       // text color (default white)
 *     size?: 'sm' | 'md' | 'lg' | 'wide'  // controls grid span
 *     badge?: ReactNode,     // small top-right badge (e.g. live count)
 *     onClick?: () => void,  // optional click handler (instead of link)
 *     testid?: string,
 *   }>
 *   title?: string
 *   subtitle?: string
 */
const SIZE_CLASS = {
  sm: 'col-span-1 row-span-1 aspect-square',
  md: 'col-span-1 row-span-1 aspect-square sm:col-span-2 sm:aspect-[2/1]',
  lg: 'col-span-2 row-span-2 aspect-square',
  wide: 'col-span-2 sm:col-span-3 aspect-[3/1]',
};

function TileInner({ Icon, label, subtitle, badge, accent = '#ffffff', color }) {
  return (
    <>
      {/* gradient overlay for depth */}
      <div
        className="absolute inset-0 opacity-90 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 60%, ${color}aa 100%)`,
        }}
      />
      {/* grain noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")",
        }}
      />
      {/* glow ring on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: `0 0 0 4px ${color}55, 0 18px 40px -10px ${color}77` }}
      />

      {/* content */}
      <div className="relative h-full p-5 flex flex-col justify-between" style={{ color: accent }}>
        <div className="flex items-start justify-between">
          <div
            className="w-11 h-11 rounded-xl grid place-items-center backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          >
            {Icon && <Icon className="w-6 h-6" strokeWidth={2.2} />}
          </div>
          {badge && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-black/25 backdrop-blur-sm">
              {badge}
            </span>
          )}
        </div>

        <div>
          {subtitle && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80 mb-1">
              {subtitle}
            </p>
          )}
          <h3 className="text-lg sm:text-xl font-black leading-tight drop-shadow-sm">
            {label}
          </h3>
        </div>
      </div>
    </>
  );
}

export default function TileHome({ tiles = [], title, subtitle, headerRight }) {
  return (
    <div className="space-y-6" data-testid="tile-home">
      {(title || subtitle || headerRight) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            {title && (
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-stone-500 mt-1">{subtitle}</p>
            )}
          </div>
          {headerRight}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 auto-rows-fr">
        {tiles.map((tile, i) => {
          const Wrapper = tile.onClick ? 'button' : Link;
          const wrapperProps = tile.onClick
            ? { onClick: tile.onClick, type: 'button' }
            : { to: tile.to };
          const sizeCls = SIZE_CLASS[tile.size || 'sm'];

          return (
            <Wrapper
              key={tile.to || tile.label || i}
              {...wrapperProps}
              data-testid={tile.testid || `tile-${(tile.label || '').toLowerCase().replace(/\s+/g, '-')}`}
              className={`group relative overflow-hidden rounded-2xl text-left transition-transform duration-300 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 ${sizeCls}`}
              style={{ background: tile.color }}
            >
              <TileInner
                Icon={tile.Icon}
                label={tile.label}
                subtitle={tile.subtitle}
                badge={tile.badge}
                accent={tile.accent}
                color={tile.color}
              />
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
