# Real-Time QR-Code Restaurant Management System - PRD

## Original Problem Statement
Real-Time In-House QR-Code Restaurant Management System with **Multi-Restaurant (Multi-Tenant) Architecture**.

- **Owner (Sahib):** Manages multiple restaurants. Creates time-limited Administrators.
- **Admin (Administrator):** Manages restaurant. Edits orders, manages venues/tables/users/staff/inventory.
- **Deep Analytics & Inventory:** Detailed inventory tracking and staff management with points system.
- **UI/UX:** Modern, sleek, informative design with smaller fonts. All text in Azerbaijani.

## Technical Stack
- Frontend: React 18, Shadcn/UI, TailwindCSS, Outfit + Manrope fonts
- Backend: FastAPI (Python), MongoDB, WebSocket, JWT/RBAC
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

### Phase 7: Staff Management & Inventory (March 2026 - Complete)
- **Staff Management Page**: Performance leaderboard, period filters (day/week/month/year)
- **Points System**: Add/deduct points with reason, full history tracking per staff
- **Shift Tracking**: Work/Rest/Absent/Late shift types with date and time
- **Inventory Page**: Ingredient CRUD with unit types (ədəd, kq, litr, qram, etc.)
- **Stock Transactions**: Purchase (stock increase) and Usage (stock decrease) tracking
- **Inventory Summary**: Total purchased vs used, cost tracking, low stock alerts
- **PIN Verification**: Uses user's personal admin_pin first

## Database Collections
- `restaurants`, `users`, `venues`, `tables`, `table_sessions`
- `categories`, `menu_items`, `menus`, `orders`, `reservations`
- `expenses`, `discounts`, `settings`
- `shift_logs` (NEW) - {user_id, date, shift_type, start_time, end_time, notes}
- `points_history` (NEW) - {user_id, points, reason, new_total}
- `ingredients` (NEW) - {name, unit, current_stock, min_stock, cost_per_unit}
- `stock_transactions` (NEW) - {ingredient_id, transaction_type, quantity, unit_cost, total_cost, stock_after}

## Credentials
- Owner: `owner` / `owner123`
- Admin: `admin1` / `admin123` (PIN: 1234)

## Remaining Tasks

### P2 (Medium Priority)
- [ ] Admin-Kitchen Voice Communication (audio/voice messaging)
- [ ] WhatsApp Integration (Twilio API key required)
- [ ] Performance optimization (N+1 queries in analytics)
- [ ] Menu item → ingredient mapping (auto-deduct stock on order)
