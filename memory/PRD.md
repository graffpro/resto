# Real-Time QR-Code Restaurant Management System - PRD

## Original Problem Statement
Multi-Restaurant (Multi-Tenant) QR-Code Restaurant Management System.

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
### Discounts: Customer sees campaign banners + discount details in orders
### Security: Headers, input sanitization, rate limiter
### Refactoring: Shared modules (database.py, models.py, auth.py, ws_manager.py)

## Credentials
- Owner: `owner` / `owner123`  
- Admin: `admin1` / `admin123` (PIN: 1234)

## Remaining Tasks
### P2: WhatsApp/Twilio integration (requires user API key)
### P2: Performance optimization (N+1 queries)
### P3: Accessibility (aria-describedby on dialogs)
### P3: Multi-language support
