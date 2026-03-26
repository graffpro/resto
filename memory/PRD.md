# Real-Time QR-Code Restaurant Management System - PRD

## Original Problem Statement
Real-Time In-House QR-Code Restaurant Management System with **Multi-Restaurant (Multi-Tenant) Architecture**.

- **Owner (Sahib):** Manages multiple restaurants. Creates time-limited Administrators.
- **Admin (Administrator):** Manages restaurant. Edits orders, manages venues/tables/users/staff/inventory.
- **Deep Analytics & Inventory:** Detailed inventory tracking and staff management with points system.
- **UI/UX:** Modern, sleek, informative design with smaller fonts. All text in Azerbaijani. "Masa" not "Stol".

## Technical Stack
- Frontend: React 18, Shadcn/UI, TailwindCSS, Outfit + Manrope fonts
- Backend: FastAPI (Python), MongoDB, WebSocket, JWT/RBAC, WebRTC, Object Storage
- Design: Terracotta (#C05C3D) + Forest Green (#2A3A2C) + Warm Gray (#F9F9F7)

## What's Been Implemented

### Phase 1-3: Core System (Complete)
- JWT Auth with RBAC, Venue/Table/Menu CRUD, QR codes, Order flow
- Analytics, Financial Reports, Expense management, Multi-menu
- Reservations, Discount campaigns, WebSocket, Receipt printing, PIN protection

### Phase 4: Multi-Restaurant Architecture (Complete)
- Restaurant CRUD with cascading deactivation/deletion
- Admin creation with time-period selection (5 gün - 1 il)

### Phase 5: UI/UX Modernization (Complete)
- Modern Login page, dark sidebars, rounded cards, small fonts

### Phase 6: Admin Features (Complete)
- Order editing, Venues & Tables CRUD, Users CRUD

### Phase 7: Staff Management & Inventory (Complete)
- Staff points, shifts, rest days, inventory, recipes, auto-deduction

### Phase 8: Voice Call & Timed Services (Complete - March 2026)
- Settings Page for service charge/tax editing
- Recipe mapping in menu item creation
- Timed Table Service (recurring service like tea every 45 min)
- Admin-Kitchen WebRTC live voice calls

### Phase 9: Quality & Security (Complete - March 2026)
- **"Stol" → "Masa"** renamed throughout entire app
- **Service charge** displayed per-order and in bill close summary modal
- **Venue grouping** on Active Tables page (sessions grouped by venue name)
- **Session deletion cascade** - deletes session + orders + timed_services
- **Image upload** for menu items via Object Storage (EMERGENT_LLM_KEY)
- **Customer page redesigned** - compact, images, search, categories, cart bottom sheet
- **WebSocket stability** - ping interval reduced to 15s, faster reconnect (1.5s)
- **Security hardening** - Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy), input sanitization, rate limiter structure

## Database Collections
- `restaurants`, `users`, `venues`, `tables`, `table_sessions`
- `categories`, `menu_items`, `menus`, `orders`, `reservations`
- `expenses`, `discounts`, `settings`
- `shift_logs`, `points_history`
- `ingredients`, `stock_transactions`, `recipes`
- `timed_services`, `files`

## Credentials
- Owner: `owner` / `owner123`
- Admin: `admin1` / `admin123` (PIN: 1234)

## Remaining Tasks

### P1 (High Priority)
- [ ] Refactor `server.py` (~2600 lines) into `/routes/`, `/models/`, `/database.py` modules

### P2 (Medium Priority)
- [ ] WhatsApp Integration (Twilio API key required from user)
- [ ] Performance optimization (N+1 queries in analytics)
- [ ] Accessibility fixes (aria-describedby on dialog modals)

### P3 (Low Priority)
- [ ] Multi-language support beyond Azerbaijani
