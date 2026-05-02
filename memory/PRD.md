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

- [x] **Wolt-Style Customer Landing Redesign (2026-02)** — Landing səhifəsi tamamilə yenidən quruldu:
  - **Compact sticky header**: Logo + "Partnyor ol" kiçik chip (ikinci dərəcəli CTA) + Customer Login pill + dil seçici
  - **Hero**: Gradient (#F4F5F2 → #FFE8D6 → #FFDEC7) fon, radial dekorativ pattern, böyük "Nə yemək istəyirsən?" başlığı, pill şəklində search bar (Bakı lokasiya chip + input + Search düyməsi)
  - **Sticky category pills** (9 kateqoriya): Hamısı / Pizza / Burger / Suşi / Milli / Kafe / Bar / Sağlam / Desert — lucide ikonlar, yatay scroll (mobile), hover-də qalxma
  - **Wolt-style restaurant cards** (grid 1/2/3 kolon): cover image (4:3 aspect), FEATURED rozeti, "25-35 dəq" çatdırılma estimate, logo overlay -bottom-6 circular, ad + rating chip (amber bg) + review count + ünvan + təsvir
  - Partner kartı tamamı Link `/menu/:restaurant_id`-ə — aşağı xətirlənmə əvəzinə birbaşa public menyu
  - Kategoriya filter "best-effort text-match" (name+description keywords: pizza, burger, sushi, cafe və s.)
  - Axtarış input real-time filtrləyir
  - **Compact "How it works"** 4 ikon row: Scan QR → Browse → Order → Enjoy (böyük section əvəzinə)
  - **FAQ accordion** (5 sual)
  - **Kiçik "Restoran sahibisiniz?" CTA card** footer-dən əvvəl (gradient amber/orange, ikinci dərəcəli)
  - **Dark footer** (#1A251E) 3 kolon: haqqında, linklər, əlaqə
  - **Restaurant register modal** saxlanıldı (rebrand + beynəlxalq telefon input)
  - `/api/partners/public` → düzgün endpoint `/api/partner-restaurants`
- [x] **Sound Effect + WebSocket Push + i18n + Phone Input (2026-02)**:
  - **Web Audio bell** (`/app/frontend/src/utils/sound.js`) — iki tonlu "ding-ding" zəng (E6 + G6 + A5 afterglow), heç bir external fayl tələb etmir
  - **Real-time WebSocket broadcast**: `POST /api/public/delivery-orders` yaradılan kimi `{type: "new_delivery_order"}` mesajı `admin` və `waiter` rollarına push olunur
  - `AdminDashboard`-da yeni `NewOrderListener` komponenti — `useWebSocket()` hook-u dinləyir, sifariş gələndə `playOrderBell()` + 6 saniyəlik toast (`🛵 Yeni çatdırılma · {name} · {total} ₼`)
  - `WebSocketProvider role="admin"` AdminDashboard-u örtür
  - **Beynəlxalq nömrə input** Restoran qeydiyyat formuna əlavə olundu (`react-phone-number-input` AZ default, bayraq + ölkə kodu)
  - **i18n yenilənmə**: 4 dilə (az/en/ru/tr) yeni keys əlavə olundu — `customer_auth`, `reservation`, `delivery`, `delivery_orders`, `public_menu` (~80 yeni key per dil)
  - Customer-facing komponentlər tam tərcümə olundu: `CustomerAuthModal`, `ReservationModal`, `DeliveryCheckoutModal`, `PublicMenuPage` (toast-lar, label-lar, placeholder-lar, success ekranları)
- [x] **Admin Çatdırılma Plitkası + İdarə Səhifəsi (2026-02)**:
  - Yeni route `/admin/delivery` → `DeliveryOrdersPage.js`
  - Admin home-da yeni yaşıl `Çatdırılma` plitkası (size: md, Truck ikon, DELIVERY subtitle, badge "X aktiv")
  - `dashboard-stats` endpoint-inə `pending_delivery` field əlavə olundu
  - Səhifə xüsusiyyətləri: 4 filter (Aktiv/Çatdırıldı/Ləğv/Hamısı) + axtarış (ad, telefon, ünvan, ID), 20s auto-refresh
  - Hər sifariş kartı: status icon + label, müştəri ad/telefon (klikbar `tel:`), ünvan, total + ödəniş tipi, "Detallar" toggle (yeməklər, ünvan qeydi, müştəri qeydi, email)
  - Status flow düymələri: pending → confirmed → preparing → out_for_delivery → delivered (avtomatik next status); Ləğv düyməsi (confirm dialog ilə); WhatsApp (`wa.me/`) + Zəng linkləri
- [x] **Customer Auth + Reservation + Delivery (2026-02)** — Wolt-vari müştəri experience tam:
  - **Backend**: `/app/backend/routes/customer.py` (passwordless email OTP + JWT, separate `customer_users` & `customer_otp` collections)
  - **Resend** inteqrasiyası — bilingual HTML OTP email (AZ + EN), Test mode default sender `onboarding@resend.dev`. Resend xətalarını zərif idarə edir (loga yazır, qeydiyyat dayanmır)
  - Endpoints: `POST /api/customer/auth/send-otp`, `POST /api/customer/auth/verify-otp`, `GET /api/customer/auth/me`, `PUT /api/customer/auth/profile`
  - `POST /api/public/reservations` — anonim/auth-bağlı rezerv (`source: "public_menu"`, status `pending`, restoran sonra təsdiqləyir)
  - `POST /api/public/delivery-orders` — qonaq sifarişi (items + address + payment_method, `subtotal`/`total` hesablanır)
  - `GET /api/admin/delivery-orders` + `PUT /api/admin/delivery-orders/{id}/status` — staff axını (pending → confirmed → preparing → out_for_delivery → delivered)
  - `GET /api/customer/delivery-orders` — istifadəçi öz tarixçəsi
  - **Frontend**: `CustomerAuthContext` provider, 3 yeni modal:
    - `CustomerAuthModal` — 2 addımlı (email+ad+telefon → 6 rəqəmli OTP), 60s resend cooldown, autofocus
    - `ReservationModal` — narıncı header, tarix/saat picker, qonaq sayı pill (1-8+), success ekranı
    - `DeliveryCheckoutModal` — 3 addım (Səbət → Detallar → Təsdiq), qty +/-, ünvan, ödəniş, success tracking
  - **PublicMenuPage**: hər item-də yaşıl `+` Səbətə əlavə düyməsi, floating cart bottom (`Sifariş ver · X ₼`), localStorage cart persistence per restaurant, "Daxil ol/Çıxış" üst-sağda
  - **react-phone-number-input** beynəlxalq nömrə input bayraq + ölkə kodu seçimi ilə (AZ default), `/app/frontend/src/styles/phone-input.css` tema
  - `RESEND_API_KEY` + `JWT_SECRET_CUSTOMER` `.env`-ə əlavə olundu, `resend==2.29.0` requirements.txt-də
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

### 2026-02 — UX Fixes + Online Order Channel + Live Stats Hero
- [x] **P0: Public menu modals had white-on-white text** (CustomerAuth, Reservation, Delivery). Root cause: modals inherited `text-white` from parent `bg-stone-950 text-white` on PublicMenuPage. Added explicit `text-stone-900` on modal content root → everything readable.
- [x] **P0: Cart qty inline on menu items** (`PublicMenuPage` / `MenuItemCard`). When an item is in cart, the `+` button morphs into a green pill `− qty +` with big tappable buttons (36×36). `decFromCart()` removes at qty=0. Cart state persists per-restaurant in localStorage.
- [x] **P0: Delivery cart modal UI overhaul** — bigger +/- buttons (40×40 red pill), price line per item (`15.99 ₼ × 3 = 47.97 ₼`), trash can remove, readable subtotal.
- [x] **P0: Resend email delivery** — user verified domain `resto.az`. Backend now uses `SENDER_EMAIL=no-reply@resto.az`, verified with real send (Gmail delivery confirmed with `resend_id`). Additionally, `_send_otp_email()` now PROPAGATES Resend errors to HTTP 502 with a bilingual actionable message (instead of silently succeeding on failure) so misconfigs can't hide again.
- [x] **P1: Live Stats Hero** (`LiveStatsHero.js`) — 4 huge vibrant gradient cards above the Metro tiles on `/admin`:
  - Today's revenue (emerald), Active orders (red/orange + pulsing LIVE badge), Pending delivery (blue + LIVE badge), Today's reservations (purple).
  - Count-up animation on value change (`useCountUp`), pulseGlow keyframe on the icon when value > 0.
  - Fed by existing `/api/admin/dashboard-stats` polled every 15s.
- [x] **P0: Online-order channel (`order_type: "dine_in_online"`)** — dedicated flow for customers ordering via website to eat at restaurant (not delivery):
  - **Backend (`routes/customer.py`)**: `PublicDeliveryRequest` gained `order_type ∈ {delivery, dine_in_online}` + optional `pickup_time`. Server validates: `dine_in_online` requires logged-in customer (401 otherwise); `delivery` requires address (400 otherwise). `delivery_orders` documents now carry `order_type` + `pickup_time`.
  - **Frontend**: `DeliveryCheckoutModal` accepts `orderType` prop; dine-in variant swaps header icon + color (amber), replaces address textarea with a friendly "Restoranda yeyəcəksiniz" block + optional pickup-time picker. `PublicMenuPage` "Restoranda yeyəcəm" chip now opens this modal (requires login + non-empty cart; no more broken `/table/:id` redirect).
  - **Admin `DeliveryOrdersPage`**: each order row now shows a coloured badge — `🍽 ONLAYN SAYT` (amber) vs `🛵 ÇATDIRILMA` (green). The address line is replaced by pickup time for dine-in orders. New-order toast also distinguishes the two channels.


### 2026-02 — i18n Landing Page Sync + Automated Translation Pipeline
- [x] **P0 Fix: Outdated SaaS text on Wolt-style Landing Page** — Replaced entire `landing.*` block in all 4 locale JSONs (`az`, `en`, `ru`, `tr`) with customer-centric keys aligned to `LandingPage.js`:
  - `hero.title` / `hero.subtitle` / `hero.search_placeholder` (e.g. "Nə yemək istəyirsən?" / "What do you want to eat?")
  - `partners.title` ("Yaxındakı restoranlar"), `count_suffix`, `no_partners`, `become_title`, `become_subtitle`, `become_cta`
  - `how.step1_title / step1_desc ... step4_title / step4_desc` (flat keys to match JS usage)
  - `faq.q1_q / q1_a ... q5_q / q5_a` (flat, customer-facing delivery/reservation/tracking FAQs)
  - `footer.about / links / contact`
  - `landing.register.*` (title, restaurant_name, owner_name, username, password, submit, have_account)
  - Removed obsolete keys: `hero.badge`, `hero.title_1/title_2`, `hero.cta_start/cta_login`, `hero.feature_*`, `hero.realtime_*`, `features.*`, `cta_banner.*`, `nav.*`.
  - All 4 files now have identical 269 string keys.
- [x] **P1: Scalable i18n automation** — Created `/app/scripts/translate-i18n.py` using **Gemini 2.5 Flash via emergentintegrations**. Features:
  - Source of truth is `az.json`; script walks every leaf key and fills missing keys in every other `*.json` in the locales folder.
  - Batches 40 keys/request, preserves placeholders (`{{name}}`, `{{count}}`) with strict validation (rejects LLM outputs with placeholder mismatch).
  - Writes output in source key order so diffs stay clean.
  - Scales to 10-15+ languages — `LANG_NAMES` already includes AZ/EN/RU/TR/FR/DE/ES/IT/PT/AR/FA/UK/PL/NL/RO/SV/HE/KA/UZ/KK/ZH/JA/KO.
  - CLI: `--lang <code>`, `--add-lang <code>` (creates new locale), `--force`, `--dry-run`.
- [x] **Yarn shortcuts** — Added `yarn translate:i18n` and `yarn translate:i18n:force` in `frontend/package.json`.
- [x] Verified end-to-end: `{"hello":"Salam","greet":"Xoş gəlmisiniz, {{name}}!"}` → `{"hello":"Hello","greet":"Welcome, {{name}}!"}` with placeholder intact. Screenshot confirms new customer-centric hero text renders.


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
