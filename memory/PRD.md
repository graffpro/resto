# Real-Time QR-Code Restaurant Management System - PRD

## Original Problem Statement
Multi-Restaurant (Multi-Tenant) QR-Code Restaurant Management System with Owner/Admin/Kitchen/Waiter roles, detailed inventory tracking with auto-deduction, staff points/shifts, WebRTC voice communication, timed table services (with automated billing), table transfers, and real-time WebSockets.

## Technical Stack
- Frontend: React 18, Shadcn/UI, TailwindCSS, React.lazy (code splitting)
- Backend: FastAPI, MongoDB, WebSocket, JWT/RBAC, WebRTC, Object Storage
- Deployment: Docker, Nginx, Supervisor (Oracle Cloud Free Tier ready)

## Implemented Features

### Core
- Auth (JWT/RBAC), CRUD, QR, Orders, Analytics, Expenses, Multi-menu, Reservations, Discounts, PIN
- Multi-Restaurant: Restaurant CRUD, cascading deactivation, time-limited admins

### UI/UX
- Modern design, "Masa" terminology, terracotta/green theme
- React.lazy() code splitting, accessibility (aria-labels, alt tags)
- Lazy loading images

### Staff & Inventory
- Points, shifts, recipes, auto-deduction from stock

### Voice & Timed Services
- WebRTC live calls, timed table service with alarm, Verildi/Yetərlidir

### Image Upload
- Menu items via Object Storage (with local fallback for production)

### Customer Page
- Redesigned compact menu with images, search, categories, cart
- Discount explanations ("Xüsusi endirim: -X%"), service charge display
- **"Ofisiant çağır" button** with 30s cooldown

### Table Transfer
- Admin moves session between tables

### Service Charge
- Applied ONLY at table close (not per order), shown in bill summary

### Waiter Call System (NEW)
- Customer button "Ofisiant" with WebSocket notification
- Waiter dashboard: Flashing red alert + ding-ding sound (5x)
- Admin also receives notifications
- Acknowledge/dismiss functionality

### Venue Order Rules (NEW)
- Per-venue rules: "require_with" type (e.g., tea requires dessert)
- Backend validation on order creation
- Admin UI to manage rules per venue

### QR Code URL Fix (NEW)
- Configurable base_url in Settings
- "Regenerate QR" button for all tables
- Frontend uses relative URLs (no IP configuration needed in Docker)

### Deployment
- Dockerfile, docker-compose.yml, nginx.conf, supervisord.conf
- entrypoint.sh auto-creates owner account
- Oracle Cloud Free Tier guide (Russian)
- No REACT_APP_BACKEND_URL needed (relative URLs)

## Credentials
- Production Owner: `graff` / `Testforresto123`
- Emergent Owner: `owner` / `owner123`
- Admin: `admin1` / `admin123` (PIN: 5159)

## Remaining Tasks
### P1: WhatsApp/Twilio integration (requires user API key)
### P2: Complete server.py refactoring to routes/
### P3: Multi-language support
