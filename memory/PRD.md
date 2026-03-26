# Real-Time QR-Code Restaurant Management System - PRD

## Original Problem Statement
Real-Time In-House QR-Code Restaurant Management System with **Multi-Restaurant (Multi-Tenant) Architecture**.

- **Owner (Sahib):** Manages multiple restaurants. Creates time-limited Administrators.
- **Admin (Administrator):** Manages restaurant. Edits orders, manages venues/tables/users/staff/inventory.
- **Deep Analytics & Inventory:** Detailed inventory tracking and staff management with points system.
- **UI/UX:** Modern, sleek, informative design with smaller fonts. All text in Azerbaijani.

## Technical Stack
- Frontend: React 18, Shadcn/UI, TailwindCSS, Outfit + Manrope fonts
- Backend: FastAPI (Python), MongoDB, WebSocket, JWT/RBAC, WebRTC
- Design: Terracotta (#C05C3D) + Forest Green (#2A3A2C) + Warm Gray (#F9F9F7)

## What's Been Implemented

### Phase 1-3: Core System (Complete)
- JWT Auth with RBAC, Venue/Table/Menu CRUD, QR codes, Order flow
- Analytics, Financial Reports, Expense management, Multi-menu
- Reservations, Discount campaigns, WebSocket, Receipt printing, PIN protection

### Phase 4: Multi-Restaurant Architecture (Complete)
- Restaurant CRUD with cascading deactivation/deletion
- Admin creation with time-period selection (5 gün - 1 il)
- Admin edit/delete with password change and expiration extension

### Phase 5: UI/UX Modernization (Complete)
- Modern Login page (split layout), dark sidebars, rounded cards
- All pages use new design system with smaller fonts

### Phase 6: Admin Features (Complete)
- Order editing (add/remove items, change quantities from menu)
- Venues & Tables full CRUD by Admin
- Users full CRUD with edit/delete/toggle

### Phase 7: Staff Management & Inventory (Complete)
- Staff Management Page: Performance leaderboard, period filters
- Points System: Add/deduct points with reason, full history
- Shift Tracking: Work/Rest/Absent/Late shift types
- Inventory Page: Ingredient CRUD with unit types
- Stock Transactions: Purchase/Usage tracking
- Recipe Mapping & Auto-Deduction: Menu items linked to ingredients

### Phase 8: New Features (March 2026 - Complete)
- **Settings Page**: Admins can edit service charge %, tax %, restaurant info, PIN
- **Recipe in Menu Item Creation**: When adding/editing menu items, admins can specify ingredient quantities (recipe) directly in the form
- **Auto-Deduction Verified**: Stock automatically decreases when orders are placed for recipe-linked items
- **Timed Table Service**: Admin can set recurring services for tables (e.g., tea every 45 minutes) with interval, mark served, and auto-deactivation on session close
- **Admin-Kitchen Voice Communication (WebRTC)**: Live audio calls between Admin and Kitchen dashboards using peer-to-peer WebRTC with signaling via WebSocket

## Database Collections
- `restaurants`, `users`, `venues`, `tables`, `table_sessions`
- `categories`, `menu_items`, `menus`, `orders`, `reservations`
- `expenses`, `discounts`, `settings`
- `shift_logs`, `points_history`
- `ingredients`, `stock_transactions`, `recipes`
- `timed_services` (NEW) - {table_id, session_id, menu_item_id, interval_minutes, next_serve_at, serve_count}

## Credentials
- Owner: `owner` / `owner123`
- Admin: `admin1` / `admin123` (PIN: 1234)

## Remaining Tasks

### P1 (High Priority)
- [ ] Refactor `server.py` (~2470 lines) into `/routes/`, `/models/`, `/database.py` modules

### P2 (Medium Priority)
- [ ] WhatsApp Integration (Twilio API key required from user)
- [ ] Performance optimization (N+1 queries in analytics)

### P3 (Low Priority)
- [ ] Accessibility improvements (aria-describedby on modals)
