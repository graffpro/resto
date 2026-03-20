# Real-Time QR-Code Restaurant Management System - PRD

## Original Problem Statement
Online WP Cafe-like application pivoted to a **Real-Time In-House QR-Code Restaurant Management System** for a single restaurant with green theme, cash-only payments, and Azerbaijani language interface.

## User Personas & Roles
1. **Owner** - Full system control (venues, tables, menus, staff management)
2. **Admin** - Staff management, analytics, expenses, reservations
3. **Kitchen** - Receives orders, tracks preparation time
4. **Waiter** - Delivers orders, tracks delivery time
5. **Customer** - Scans QR code, orders without registration

## Core Requirements
- Dynamic Table Management with auto-generated QR codes
- Real-time order flow with WebSocket notifications
- Operational analytics (prep/delivery times)
- Multi-menu support (Breakfast, Lunch, Dinner)
- Expense tracking (daily/weekly/monthly)
- Table reservations
- Discount campaigns
- Financial reporting (revenue - expenses = profit)
- Receipt printing
- Azerbaijani language (AZ)

## Technical Stack
- **Frontend**: React 18, Shadcn/UI, TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Real-time**: WebSocket
- **Authentication**: JWT with role-based access

## What's Been Implemented (December 2025)

### Phase 1: Core System ✅
- [x] JWT Authentication with RBAC
- [x] Venue and Table management
- [x] QR code generation for tables
- [x] Category and Menu Items CRUD
- [x] Order flow (Customer → Kitchen → Waiter)
- [x] Table sessions management

### Phase 2: Analytics & Management ✅
- [x] Professional Analytics (prep/delivery times)
- [x] Financial Reports (revenue, expenses, profit)
- [x] Expense management (categories: Kommunal, Ərzaq, Əməkhaqqı, İcarə, Təmir, Digər)
- [x] Multi-menu support

### Phase 3: Advanced Features ✅
- [x] Table Reservations with status management
- [x] Discount campaigns (percentage/fixed)
- [x] WebSocket real-time notifications for Kitchen/Waiter
- [x] Receipt printing component

### Phase 4: Testing ✅
- [x] Backend API tests (25/25 passed)
- [x] Frontend UI testing (all pages functional)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user (role-based)

### Venues & Tables
- `GET/POST /api/venues` - CRUD venues
- `GET/POST /api/tables` - CRUD tables with QR codes
- `GET /api/tables/available` - Get available tables for date

### Menu Management
- `GET/POST /api/menus` - Multi-menu CRUD
- `GET/POST /api/categories` - Category CRUD
- `GET/POST /api/menu-items` - Menu items CRUD

### Orders & Sessions
- `POST /api/sessions/start/{table_id}` - Start customer session
- `GET /api/sessions/active` - Get active sessions
- `POST /api/orders` - Create order (triggers WebSocket)
- `GET /api/orders/kitchen` - Kitchen orders
- `GET /api/orders/waiter` - Waiter orders
- `PUT /api/orders/{id}/status` - Update order status

### Reservations
- `GET/POST /api/reservations` - CRUD reservations
- `PUT /api/reservations/{id}/status` - Update status

### Expenses
- `GET/POST /api/expenses` - CRUD expenses

### Discounts
- `GET/POST /api/discounts` - CRUD discounts
- `GET /api/discounts/active` - Active discounts
- `PUT /api/discounts/{id}/toggle` - Toggle active status

### Analytics
- `GET /api/analytics/detailed` - Detailed order analytics
- `GET /api/analytics/financial` - Financial report
- `GET /api/analytics/popular-items` - Popular items

### Settings
- `GET/PUT /api/settings` - Restaurant settings

## Database Schema

### Collections
- `users` - Staff accounts with roles
- `venues` - Restaurant venues/halls
- `tables` - Tables with QR codes
- `table_sessions` - Active customer sessions
- `categories` - Menu categories
- `menu_items` - Food/drink items
- `menus` - Multiple menus (breakfast, lunch, dinner)
- `orders` - Customer orders with timestamps
- `reservations` - Table reservations
- `expenses` - Expense records
- `discounts` - Discount campaigns
- `settings` - Restaurant settings

## Credentials
- **Owner**: username: `owner`, password: `owner123`

## Remaining/Future Tasks

### P0 (High Priority)
- [ ] WhatsApp integration for customer notifications (needs Twilio API key)

### P1 (Medium Priority)
- [ ] Performance testing under load
- [ ] Enhanced receipt templates
- [ ] Bulk import/export for menu items

### P2 (Low Priority)
- [ ] Dark mode support
- [ ] Mobile app version
- [ ] Integration with POS systems

## Known Issues
- Minor: Dialog accessibility warnings (missing aria-describedby)
