# Real-Time QR-Code Restaurant Management System - PRD

## Original Problem Statement
Real-Time In-House QR-Code Restaurant Management System pivoted to a **Multi-Restaurant (Multi-Tenant) Architecture**.

- **Owner (Sahib):** Manages multiple restaurants. Creates "Administrators" with login, password, PIN, and time-limited access (5 days, 2 weeks, 1 month, etc.). Not visible to other users.
- **Admin (Administrator):** Manages a specific restaurant. Can edit orders, manage venues/tables/users, uses modern sleek UI.
- **Deep Analytics & Inventory:** Detailed inventory tracking and staff management needed.
- **UI/UX:** Modern, sleek, informative design with smaller fonts. All text in Azerbaijani.

## Technical Stack
- **Frontend**: React 18, Shadcn/UI, TailwindCSS, Outfit + Manrope fonts
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Real-time**: WebSocket
- **Authentication**: JWT with RBAC + Admin PIN security
- **Design System**: Terracotta (#C05C3D) + Forest Green (#2A3A2C) + Warm Gray (#F9F9F7)

## What's Been Implemented

### Phase 1: Core System (Complete)
- [x] JWT Authentication with RBAC (Owner, Admin, Kitchen, Waiter, Customer)
- [x] Venue and Table management (full CRUD by Admin)
- [x] QR code generation for tables
- [x] Category and Menu Items CRUD
- [x] Order flow (Customer > Kitchen > Waiter)
- [x] Table sessions management

### Phase 2: Analytics & Management (Complete)
- [x] Professional Analytics (prep/delivery times)
- [x] Financial Reports (revenue, expenses, profit)
- [x] Expense management
- [x] Multi-menu support

### Phase 3: Advanced Features (Complete)
- [x] Table Reservations
- [x] Discount campaigns (percentage/fixed, item-level and cart-level)
- [x] WebSocket real-time notifications
- [x] Receipt printing component
- [x] Admin PIN protection for sensitive routes
- [x] Detailed Bill Summary on table close

### Phase 4: Multi-Restaurant Architecture (March 2026 - Complete)
- [x] Restaurant CRUD (Owner creates/manages multiple restaurants)
- [x] Admin creation with time-period selection (5 gün, 2 həftə, 1 ay, 3 ay, 6 ay, 1 il)
- [x] Admin edit/delete with password change and expiration extension
- [x] Cascading deactivation & deletion (Restaurant > Admin > Staff)
- [x] Admin expiration check on login
- [x] Owner hidden from other user listings

### Phase 5: UI/UX Modernization (March 2026 - Complete)
- [x] Modern Login page with split layout and restaurant image
- [x] Owner Dashboard with dark sidebar and modern cards
- [x] Admin Dashboard with compact dark sidebar and all nav items
- [x] All pages updated with new design system (terracotta/forest-green)
- [x] Smaller fonts (text-xs, text-sm) across all pages
- [x] Rounded cards (rounded-2xl) and smooth hover effects

### Phase 6: Admin Order Editing & Venue Management (March 2026 - Complete)
- [x] Admin can edit orders (add/remove items, change quantities)
- [x] Admin can manage Venues (create, edit, delete)
- [x] Admin can manage Tables (create, edit, delete, QR codes)
- [x] Admin Users page with full edit/delete/toggle status
- [x] "Close Table" button ONLY inside detail modal
- [x] Restaurant/Admin delete functionality

## Database Schema
- `restaurants` - {id, name, address, phone, whatsapp, email, tax_percentage, service_charge_percentage, is_active, created_by}
- `users` - {id, username, password, role, full_name, restaurant_id, admin_pin, is_active, expires_at, created_by, rest_days, points}
- `venues` - {id, name, description}
- `tables` - {id, table_number, venue_id, qr_code}
- `table_sessions` - {id, table_id, session_id, is_active, orders, started_at, closed_at}
- `categories` - {id, name}
- `menu_items` - {id, name, category_id, price, image_url, discount_percentage}
- `orders` - {id, session_id, table_id, items, total_amount, status, ordered_at}
- `reservations` - {id, table_id, customer_name, customer_phone, reservation_date}
- `expenses` - {id, name, amount, category, expense_type, date}
- `discounts` - {id, name, type, value, min_order_amount, is_active}
- `settings` - {admin_pin, restaurant_name, etc.}

## Credentials
- **Owner**: username: `owner`, password: `owner123`
- **Admin**: username: `admin1`, password: `admin123`, PIN: `1234`

## Remaining/Future Tasks

### P1 (High Priority)
- [ ] Staff Shift & Points System (Waiter rest days/shifts, performance points with daily/monthly/yearly analytics)
- [ ] Inventory/Stock Tracking (raw materials - eggs bought vs. sold mapping)

### P2 (Medium Priority)
- [ ] Admin-Kitchen Voice Communication (audio/voice messaging)
- [ ] WhatsApp Integration for customer notifications (needs Twilio API key)
- [ ] Performance optimization (N+1 queries in analytics endpoints)
- [ ] Enhanced receipt templates
