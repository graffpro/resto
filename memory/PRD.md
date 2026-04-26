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

## Pending / Upcoming Tasks
- P0 (NEXT): Root domain (`resto.az`) aggressively redirects `/` to `/login` — investigate frontend routing/cache
- P1: WhatsApp/Twilio Integration (daily sales reports)
- P1: iOS build (requires Mac + Apple Developer account)
- P2: server.py Refactoring (DONE — already in routes/)
- P3: Multi-language support
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
