# QR Restoran - Product Requirements Document

## Original Problem Statement
Multi-Restaurant (Multi-Tenant) QR-Code Architecture Management System. Features include Owner/Admin/Kitchen/Waiter roles, detailed inventory tracking, WebRTC voice communication, timed table services, table transfers, real-time WebSockets, and QR-based digital menus.

## Core Requirements
- Complex routing: Multi-Kitchen tracking where different items go to different kitchens/waiters
- Waiter/Kitchen dashboards: continuous, persistent audio alerts for new orders/calls until acknowledged
- Customer Menu: highly dynamic, support custom restaurant background images, display item details in popup/modal before adding to cart

## Tech Stack
- Frontend: React + Tailwind CSS + Shadcn/UI
- Backend: FastAPI + MongoDB
- Real-time: WebSockets
- Deployment: Docker + Nginx (Oracle Cloud)
- Auth: JWT-based

## Architecture
```
/app/
├── backend/
│   ├── server.py          # Monolithic API (2900+ lines)
│   ├── models.py          # Pydantic schemas
│   ├── auth.py            # JWT Auth
│   ├── ws_manager.py      # WebSocket manager
│   ├── database.py        # MongoDB connection
├── frontend/
│   ├── src/pages/
│   │   ├── customer/CustomerPage.js  # Dark-themed customer menu
│   │   ├── waiter/WaiterDashboard.js # With continuous alarms
│   │   ├── kitchen/KitchenDashboard.js # With station filter + alarms
│   │   ├── admin/MenuManagement.js   # Station selector for items
│   │   ├── admin/SettingsPage.js     # Background URL + Logo settings
├── deploy/               # Docker, nginx, supervisord
```

## Completed Features

### Phase 1 (Previous Sessions)
- [x] Multi-restaurant support with venues/tables
- [x] QR code generation with custom base URL
- [x] Session device locking (security)
- [x] Venue order rules (required items per category)
- [x] Call Waiter feature with WS broadcasting
- [x] Discount campaigns (per-item + order-level)
- [x] Inventory management with auto-deduction
- [x] WebRTC voice calls
- [x] Timed table services
- [x] Table transfers
- [x] Analytics + Financial reports
- [x] Oracle Cloud deployment files
- [x] Local image storage fallback

### Phase 2 (Session - Feb 2026)
- [x] Multi-Kitchen Routing (target_station field)
- [x] Continuous Audio Alarms (Web Audio API)
- [x] Customer Menu Redesign (dark theme, modal)
- [x] Admin PIN verification for Owner role
- [x] Settings: menu_background_url, logo_url

### Phase 3 (Session - Feb 2026)
- [x] Android APK (Capacitor 6)
- [x] Foreground Service for background notifications
- [x] 4-second polling for native apps
- [x] APK download from admin panel

### Phase 4 (Current Session - Feb 2026)
- [x] **Bar role** added — full UserRole enum, dashboard redirect, kitchen endpoint access, user creation form
- [x] **Owner can create any role** (not just admin)
- [x] **QR codes hardcoded to resto.az** — settings removed, auto-generates
- [x] **Timed service expiry notifications** — background task checks every 30s, WebSocket alert to waiter/kitchen
- [x] **Landing page** (tabres.com style) — Hero, Features bento grid, How It Works, FAQ, Footer
- [x] **Public registration** — POST /api/auth/register creates restaurant + admin user
- [x] **Number input bug fixed** — empty string allowed in all number fields
- [x] **entrypoint.sh safe** — no longer deletes existing DB data on restart

### Phase 5 (Current Session - Apr 2026)
- [x] **Multi-tenant data isolation (P0 fix)** — every collection now carries `restaurant_id` and every API endpoint filters/stamps it
  - Models updated: `Venue`, `Table`, `TableSession`, `Category`, `MenuItem`, `Order` carry `restaurant_id`
  - Helpers: `tenant_query(current_user)` and `stamp_restaurant_id(doc, current_user)` in `routes/shared.py`
  - Authenticated GET endpoints scope by `current_user.restaurant_id` (owners bypass)
  - Public endpoints (`/categories`, `/menu-items`, `/settings`, `/stations`, `/discounts/active`, `/menus`, `/venues`, `/tables`, `/tables/available`) accept `restaurant_id` query param
  - Customer page derives `restaurant_id` from the table on session start and passes it to all menu APIs
  - Per-tenant `settings` document keyed by `restaurant_id` (auto-created on first read)
  - One-time startup migration stamps legacy data with the original admin's tenant id
- [x] Bug fix: `/api/orders/kitchen` was missing its `@router.get` decorator — restored
- [x] Bug fix: `routes/inventory.py` was missing `timedelta` import; `routes/services.py` was missing `APP_NAME` import
- [x] **Admin reactivation bug fixed** — when Owner reactivates a restaurant, all its staff users are now also reactivated (previously only deactivation was synced)
- [x] **Internationalization (i18n)** — 4 languages: Azerbaijani, Turkish, Russian, English
  - `react-i18next` + `i18next-browser-languagedetector` with auto-detect from `navigator.language`
  - Persistence in `localStorage[qr_lang]`
  - `LanguageSwitcher` component with flag emoji + country name dropdown (header)
  - Translation files in `/app/frontend/src/i18n/locales/{az,tr,ru,en}.json`
  - Landing page (nav, hero, partners section) + register modal fully translated
- [x] **Partner Restaurants directory (Landing Page)**
  - New backend `routes/partners.py` with collections `partner_restaurants` + `partner_ratings`
  - Owner-only management: `GET/POST/PUT/DELETE /api/owner/partners`, `GET /api/owner/eligible-restaurants`
  - Public: `GET /api/partner-restaurants` (filters: featured, near_lat/near_lng/radius_km), `GET /api/partner-restaurants/:id`
  - Public ratings: `POST /api/partner-restaurants/:id/rate` (1–5 stars + comment), aggregated `rating_avg` & `ratings_count`
  - Featured slot (larger card, gradient, sparkle badge), nearby filter (geolocation + Haversine distance)
  - Partner detail modal: logo/cover, description, address, phone, Instagram/Facebook/WhatsApp/website links, Google Maps embed, "View Menu" deep link to `/table/<menu_table_id>`, Directions to Google Maps, in-modal star rating submit
  - Owner Dashboard: new `/owner/partners` page — visible/hidden + featured toggles, full edit form

- [x] **Comment translation** — `POST /api/translate` powered by Emergent LLM (Gemini 2.5 Flash). Each review card has a "Tərcümə et" button that translates the comment to the user's UI language (az/tr/ru/en). Cache stored in `db.translation_cache` to avoid repeated LLM calls.
- [x] **P0 Fix: resto.az → /login redirect bug** — `ProtectedRoute` now redirects unauthenticated users to `/` (Landing Page) instead of `/login`. Stale `localStorage.token` is cleared before redirect. Axios 401/403 interceptor in `AuthContext` auto-clears expired tokens.
- [x] **i18n full coverage** — Landing (Hero overlay, Features, Steps, FAQ, CTA, Footer), Admin nav (Finance/Sales/Staff), Owner panel (RestaurantsPage heading/search/badges/buttons, OwnerDashboard sidebar role labels), Login success toast — all switched to `t()` with new keys in `landing.features.*`, `landing.how.step{1-3}`, `landing.faq.q{1-5}`, `landing.cta_banner.*`, `admin.*`, `owner_panel.*`. Language native names: **Azərbaycanca / Türkçe / Русский / English**.
- [x] **Dashboard LanguageSwitcher** — added to Admin sidebar (dark variant), Owner sidebar (dark), Kitchen header, Waiter header.

- [x] **Owner panel internal dialogs translated** — New/Edit Restaurant forms (name/address/phone/whatsapp/email/description/tax/service), Admins list & create/edit forms (full_name/username/password/PIN/period/expires_at/cancel/save). New i18n namespace `dialogs.*` added across all 4 locales.

- [x] **Live Tile Stats + Public Menu (2026-02)** — Wolt-vari customer experience başlanğıc:
  - Yeni endpoint `GET /api/admin/dashboard-stats` — Tables aktiv, today reservations, pending orders, active discounts, low stock, today revenue, users count (15s tezliyində refresh)
  - Admin plitkalarında **canlı badge-lər**: Tables `4 aktiv`, Menu `6 sifariş`, Users `9`, Discounts `1 aktiv` və s.
  - Yeni public endpoint `GET /api/public/restaurant/{restaurant_id}` — yalnız visible partner restoranlar
  - Yeni səhifə `/app/frontend/src/pages/public/PublicMenuPage.js` (`/menu/:restaurantId`) — tam-ekran dark dizayn, hero cover, logo, rating, axtarış, kategoriya filtri, item detail modal. **Masa məşğul edilmir**.
  - Action chips: Directions, Phone, Rezerv et (toast placeholder), Çatdırılma (toast placeholder), Restoranda sifariş ver (köhnə `/table/<id>` flow)
  - PartnersSection kartları artıq tamamı `<Link>` `/menu/<restaurant_id>` ünvanına aparır; ⓘ Info düyməsi köhnə detail modalını saxlayır (rating + reviews + map)
  - Landing-ə "Bizimlə Partnyor Ol" qabarıq CTA əlavə olundu — `window.dispatchEvent('open-restaurant-register')` ilə qeydiyyat modal açılır
- [x] **Dashboard Metro-Tile Redesign (2026-02)** — Owner & Admin paneli tamamilə yeniləndi:
  - Yan menyu (sidebar) silindi → əvəzində slim üst bar (logo, istifadəçi çipi, voice call, APK, dil, logout)
  - Ana səhifə artıq parlaq Metro-tile grid (Windows Modern UI / ERP12 üslubu): yumuşaq köşəli kvadrat plitkalar, gradient overlay, grain texture, hover-də lift + glow ring
  - Owner home: 3 plitka (Restoranlar, Partnyorlar, Ayarlar)
  - Admin home: 13 plitka (Tables, Reservations, Menu, Venues, Users, Staff, Inventory, Expenses, Discounts, Analytics, Finance, Sales, Settings) — vibrant rəng paleti (qırmızı=Live, narıncı=Book, sarı=Costs, mavi=Team, yaşıl=Money, bənövşəyi=Venue və s.)
  - Hər plitka subtitle (LIVE / BOOK / KITCHEN və s.) + böyük ikon + ad göstərir
  - Sub-page açılanda yuxarıda "← 🏠 Ana səhifə" düyməsi avtomatik görünür
  - Yeni komponent: `/app/frontend/src/components/layouts/TileHome.js` (reusable), `/app/frontend/src/components/layouts/DashboardTopBar.js`
  - `/admin` route artıq tile home; əvvəlki `ActiveTablesPage` indi `/admin/tables` ünvanındadır
- [x] **Partner Form UX overhaul (2026-02)** — Owner panel `/owner/partners` redesign per user request:
  - Logo & Cover URL → file upload (uses existing `/api/upload/image`, 5MB limit, preview thumbnails, change/remove)
  - **Sayt** field removed (now part of dynamic social links list)
  - **Menyu masa ID** field hidden — auto-populated on restaurant select (first table by `created_at`); existing partners keep their `menu_table_id`
  - **Ünvan** accepts Google Maps share links (`https://maps.app.goo.gl/...`); public detail modal shows clickable "Xəritədə aç" link instead of raw URL
  - **Sosial şəbəkələr** is now a dynamic list — unlimited entries with platform selector: Instagram, Facebook, **TikTok**, YouTube, X, Telegram, WhatsApp, LinkedIn, Sayt, Digər. Backend stores `social_links: List[{platform, url, label}]` (legacy `instagram/facebook/whatsapp/website` fields kept for back-compat)
  - Latitude/Longitude fields hidden (rarely needed; map embed works from address text)
  - `GET /api/tables?restaurant_id=X` now respects the param for OWNER role (was being ignored)
- [x] **P0 Fix (2026-02): Production Docker build crash** — Added `RUN pip install --no-cache-dir emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/` to `/app/deploy/Dockerfile` (after standard `pip install -r requirements.txt`). Resolves `ModuleNotFoundError: No module named 'emergentintegrations'` on user's Contabo VPS. Verified: local backend RUNNING, `POST /api/translate` returns translated text successfully via Gemini 2.5 Flash. `docker-compose.yml` already forwards `EMERGENT_LLM_KEY` env var.

## Pending / Upcoming Tasks
- P0 (NEXT): Online Payment integration (Stripe / Pulpal) — let customers pay by phone
- P0 (NEXT): Loyalty Points System (Sədaqət Proqramı) — CRM, phone verification, stamp card UI
- P1: Real-Time Dashboard TV Screen — large-screen live stats UI for owners
- P1: AI Menu Assistant — chat UI with smart recommendations
- P1: Promo Codes / Discount Coupons — extend `discounts` collection
- P1: Customer Web Push Notifications — VAPID + Service Worker
- P2: Auto Backup (Dropbox/GDrive) — cron job mongodump + upload
- P2: Delivery Module (Yandex/Wolt) — address picker + courier tracking
- P2: Staff Performance Gamification — leaderboards from `staff_performance`
- P1: WhatsApp/Twilio Integration (daily sales reports)
- P1: Translate remaining dashboards (Admin/Kitchen/Waiter UI) — currently only Landing is translated
- P1: iOS build (requires Mac + Apple Developer account)
- P3: Multi-language support (full coverage of all dashboards)
- P3: Domain + SSL configuration
- P3: Play Store publication

## Key API Endpoints
- `GET /api/stations` - List kitchen stations
- `POST /api/stations` - Create custom station
- `GET /api/orders/kitchen?station=X` - Filter orders by station
- `POST /api/orders` - Create order (auto-populates target_station)
- `GET /api/settings` - Includes menu_background_url, logo_url
- `GET /api/download/apk` - Download Android APK file

## Key Data Models
- MenuItem: includes `target_station` (kitchen/bar/waiter)
- OrderItem: includes `target_station` (populated from menu item)
- Settings: includes `menu_background_url`, `logo_url`
