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

### Phase 2 (Current Session - Feb 2026)
- [x] **Multi-Kitchen Routing** - MenuItem has `target_station` field (kitchen/bar/waiter). Orders automatically route items to correct stations. Kitchen dashboard has station filter dropdown. WebSocket notifications route by station.
- [x] **Continuous Audio Alarms** - Kitchen and Waiter dashboards play persistent alarm sounds (via Web Audio API `startContinuousAlarm`) when new orders/calls arrive. Red alarm banner with "Sesi dayandır" (Stop Sound) button. Auto-stops when no pending items remain.
- [x] **Customer Menu Redesign** - Dark navy/amber themed UI. 2-column grid layout. Item detail modal popup with full image, description, price, prep time. Custom background image from settings. Restaurant name + logo display.
- [x] Admin PIN verification fixed for Owner role
- [x] Settings page: added menu_background_url and logo_url fields

### Phase 3 (Current Session - Capacitor Android App)
- [x] **Android APK Build** - Capacitor 6 integration with native Android project
- [x] **Foreground Service** - OrderNotificationService keeps app alive in background
- [x] **Local Notifications** - Native Android notifications when new orders arrive
- [x] **Keep Screen On** - WindowManager.FLAG_KEEP_SCREEN_ON for kitchen/waiter devices
- [x] **Aggressive Polling** - 4-second polling interval in native app (vs 15s in web)
- [x] **Vibration** - Device vibrates on new order alerts
- [x] **APK Download** - GET /api/download/apk endpoint serves the built APK
- [x] **Build Script** - scripts/build-apk.sh for rebuilding with custom server URL

## Pending / Upcoming Tasks
- P1: WhatsApp/Twilio Integration (daily sales reports)
- P1: iOS build (requires Mac + Apple Developer account)
- P2: server.py Refactoring (2900+ lines → routes/)
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
