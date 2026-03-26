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

### Phase 1-7: Core System (Complete)
- Full CRUD, Auth, Analytics, Inventory, Staff, Recipe auto-deduction, WebSocket

### Phase 8: Voice Call & Timed Services (Complete)
- Settings Page, Recipe in Menu, Timed Table Service, WebRTC Voice Calls

### Phase 9: Quality & Security (Complete - March 2026)
- "Stol" → "Masa", Service charge display, Venue grouping, Session cascade delete
- Image upload via Object Storage, Customer page redesign, WebSocket stability
- Security headers, input sanitization

### Phase 9.1: Timed Service Alarm (Complete - March 2026)
- **Sound alarm**: "ding ding, ding ding, ding ding" pattern when timed service is due
- **Visual alert**: Table card flashes red with pulse animation
- **Red badge**: Shows menu item name (e.g., "Çay") on the alerting table
- **Button text**: Changes to "Xidmət vaxtı çatıb!" (Service time arrived!)
- **Repeat alarm**: Sounds every 8 seconds until "Verildi" (Served) is clicked
- **Auto-stop**: Alarm stops when service is marked as served

## Credentials
- Owner: `owner` / `owner123`
- Admin: `admin1` / `admin123` (PIN: 1234)

## Remaining Tasks

### P1 (High Priority)
- [ ] Refactor `server.py` (~2600 lines) into `/routes/`, `/models/` modules

### P2 (Medium Priority)
- [ ] WhatsApp Integration (Twilio API key required)
- [ ] Performance optimization (N+1 queries)
- [ ] Accessibility fixes (aria-describedby)
