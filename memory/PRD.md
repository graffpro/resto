# Real-Time QR-Code Restaurant Management System - PRD

## Original Problem Statement
Real-Time In-House QR-Code Restaurant Management System pivoted to a **Multi-Restaurant (Multi-Tenant) Architecture**.

- **Owner Role:** Manages multiple restaurants. Creates "Administrators" for specific restaurants, assigning them a login, password, PIN, and an **expiration date**.
- **Admin Role:** Manages a specific restaurant. Edits orders, uses modern sleek UI, communicates with Kitchen via Voice/Audio.
- **Deep Analytics & Inventory:** Detailed inventory tracking and staff management (Waiters' days off, shift tracking, performance/points system).
- **UI/UX:** Modern, sleek, informative design with smaller fonts. All text in Azerbaijani.

## User Personas & Roles
1. **Owner** - Full system control (manages multiple restaurants, creates Admins)
2. **Admin** - Restaurant-level management (staff, analytics, expenses, orders)
3. **Kitchen** - Receives orders, tracks preparation time
4. **Waiter** - Delivers orders, tracks delivery time
5. **Customer** - Scans QR code, orders without registration

## Technical Stack
- **Frontend**: React 18, Shadcn/UI, TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Real-time**: WebSocket
- **Authentication**: JWT with role-based access + Admin PIN security

## What's Been Implemented

### Phase 1: Core System
- [x] JWT Authentication with RBAC
- [x] Venue and Table management
- [x] QR code generation for tables
- [x] Category and Menu Items CRUD
- [x] Order flow (Customer > Kitchen > Waiter)
- [x] Table sessions management

### Phase 2: Analytics & Management
- [x] Professional Analytics (prep/delivery times)
- [x] Financial Reports (revenue, expenses, profit)
- [x] Expense management
- [x] Multi-menu support

### Phase 3: Advanced Features
- [x] Table Reservations
- [x] Discount campaigns (percentage/fixed, item-level and cart-level)
- [x] WebSocket real-time notifications
- [x] Receipt printing component
- [x] Admin PIN protection for sensitive routes
- [x] Detailed Bill Summary on table close

### Phase 4: Multi-Restaurant Architecture (March 2026)
- [x] Restaurant CRUD (Owner creates/manages multiple restaurants)
- [x] Admin creation with expiration dates and PIN codes
- [x] Cascading deactivation (Restaurant > Admin > Staff)
- [x] Admin expiration check on login
- [x] Modern Owner Dashboard with RestaurantsPage
- [x] "Close Table" button moved inside detail modal only

## Database Schema

### Collections
- `restaurants` - {id, name, address, phone, whatsapp, email, tax_percentage, service_charge_percentage, is_active, created_by}
- `users` - {id, username, password, role, full_name, restaurant_id, admin_pin, is_active, expires_at, created_by, rest_days, points}
- `venues` - Restaurant venues/halls
- `tables` - Tables with QR codes
- `table_sessions` - Active customer sessions
- `categories` - Menu categories
- `menu_items` - Food/drink items with per-item discounts
- `menus` - Multiple menus (breakfast, lunch, dinner)
- `orders` - Customer orders with timestamps and discounts
- `reservations` - Table reservations
- `expenses` - Expense records
- `discounts` - Discount campaigns
- `settings` - Restaurant settings

## Credentials
- **Owner**: username: `owner`, password: `owner123`
- **Admin**: username: `admin1`, password: `admin123` (test account)

## Remaining/Future Tasks

### P0 (High Priority)
- [ ] UI/UX Modernization across all Admin pages (smaller fonts, sleek design)

### P1 (Medium Priority)
- [ ] Staff Shift & Points System (Waiter rest days/shifts, performance points with daily/monthly/yearly analytics)
- [ ] Inventory/Stock Tracking (raw materials, eggs bought vs. sold mapping)
- [ ] Order Editing for Admins (add/remove items from active table sessions)

### P2 (Low Priority)
- [ ] Admin-Kitchen Voice Communication (audio/voice messaging)
- [ ] WhatsApp Integration for customer notifications (needs Twilio API key)
- [ ] Performance optimization (N+1 queries in analytics)
- [ ] Enhanced receipt templates

## Known Issues
- Minor: Dialog accessibility warnings (missing aria-describedby)
