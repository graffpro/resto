# Real-Time QR-Code Restaurant Management System - PRD

## Original Problem Statement
Multi-Restaurant (Multi-Tenant) QR-Code Restaurant Management System with Owner/Admin/Kitchen/Waiter/Customer roles.

## Technical Stack
- Frontend: React 18, Shadcn/UI, TailwindCSS
- Backend: FastAPI, MongoDB, WebSocket, JWT/RBAC, WebRTC, Object Storage

## What's Been Implemented (Complete)

### Core: Auth, CRUD, QR, Orders, Analytics, Expenses, Multi-menu, Reservations, Discounts, PIN protection
### Multi-Restaurant: Restaurant CRUD, cascading deactivation, time-limited admins
### UI/UX: Modern design, dark sidebars, terracotta/green theme, "Masa" not "Stol"
### Admin Features: Order editing, Venues & Tables CRUD, Users CRUD
### Staff & Inventory: Points, shifts, recipes, auto-deduction from stock
### Voice & Timed Services: WebRTC live calls, timed table service with alarm
### Quality & Security: Service charge display, venue grouping, image upload, customer redesign, security headers

### Latest Features (March 2026):
- **Verildi = Hesaba Əlavə**: Vaxtlı xidmət "Verildi" basılanda sifariş yaradılır (TS- prefix)
- **Yetərlidir düyməsi**: Müştəri daha istəmirsə vaxtlı xidməti dayandırır
- **Masa Dəyişdir**: Admin müştərini bir masadan digərinə köçürə bilər (session, orders, timed_services hamısı köçürülür)
- **Vaxtlı Xidmət Alarmı**: Masa kartı qırmızı yanıb sönür, "ding ding" səs çalır

## Credentials
- Owner: `owner` / `owner123`
- Admin: `admin1` / `admin123` (PIN: 1234)

## Remaining Tasks
### P1: Refactor `server.py` (~2700 lines) into modular routes
### P2: WhatsApp/Twilio integration, Performance optimization
