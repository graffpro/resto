# Real-Time QR-Code Restaurant Management System - PRD

## Original Problem Statement
Multi-Restaurant (Multi-Tenant) QR-Code Restaurant Management System with Owner/Admin/Kitchen/Waiter roles, detailed inventory tracking with auto-deduction, staff points/shifts, WebRTC voice communication, timed table services (with automated billing), table transfers, and real-time WebSockets.

## Technical Stack
- Frontend: React 18, Shadcn/UI, TailwindCSS
- Backend: FastAPI, MongoDB, WebSocket, JWT/RBAC, WebRTC, Object Storage
- Modular: database.py, models.py, auth.py, ws_manager.py + server.py

## Implemented Features (All Complete & Tested)

### Core: Auth, CRUD, QR, Orders, Analytics, Expenses, Multi-menu, Reservations, Discounts, PIN
### Multi-Restaurant: Restaurant CRUD, cascading deactivation, time-limited admins
### UI/UX: Modern design, "Masa" (not "Stol"), terracotta/green theme
### Staff & Inventory: Points, shifts, recipes, auto-deduction from stock
### Voice & Timed Services: WebRTC live calls, timed table service with alarm (ding-ding), Verildi/Yetərlidir
### Image Upload: Menu items via Object Storage
### Customer: Redesigned compact menu with images, search, categories, cart
### Table Transfer: Admin moves session between tables
### Service Charge: Applied ONLY at table close (not per order), shown in bill summary
### Discounts: Customer sees campaign banners + discount details in orders with clear explanations
### Security: Headers, input sanitization, rate limiter
### Refactoring: Shared modules (database.py, models.py, auth.py, ws_manager.py)

## Recently Completed (This Session)
- Fixed CustomerPage.js: orders section, total bill, discount explanations, service charge display
- Added estimated service charge (10%) to customer orders panel
- Added per-item discount explanation text ("Xüsusi endirim: -X%", "Məhsul endirimi: -X%")
- Performance: React.lazy() + Suspense for route-based code splitting
- Accessibility: aria-labels, autoComplete, role attributes, image lazy loading
- Docker deployment files: Dockerfile, docker-compose.yml, nginx.conf, supervisord.conf
- Oracle Cloud Free Tier deployment guide (Azerbaijani)

## Credentials
- Owner: `owner` / `owner123`
- Admin: `admin1` / `admin123` (PIN: 5159)

## Remaining Tasks
### P1: WhatsApp/Twilio integration (requires user API key)
### P2: Complete server.py refactoring to routes/
### P3: Multi-language support
