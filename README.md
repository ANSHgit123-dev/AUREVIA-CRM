# AUREVIA CRM — Real Estate Sales & Management Platform
*Enterprise Real Estate CRM for Residential Developers in India*

---

## Overview
AUREVIA CRM is a high-performance sales, inventory, and customer relationship management platform engineered for residential developers in India. Built with **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Supabase (PostgreSQL with Row Level Security)**.

---

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, TanStack Query.
- **Backend / Database**: Supabase, PostgreSQL 15+, Row Level Security (RLS), Atomic RPCs.
- **State & Routing**: React Router v7, Context API (Auth & Project Scoping).

---

## Phase 1 Deliverables
1. **Application Shell & Layout**:
   - Collapsible Deep Navy Sidebar (`#0B132B`) with all 11 core module navigation links.
   - Professional Top Navigation with instant global search, notification bell, project switcher, and user avatar.
   - Interactive Demo RBAC Role Switcher in profile menu (Super Admin, Director, Sales Manager, Closer, Presales).
2. **Executive Dashboard**:
   - High-density KPI cards: Total Active Leads, Site Visits (MTD), Bookings Realized, Lead-to-Booking Ratio.
   - Sales Velocity Area Chart (leads ingested vs booking value in ₹ Crores).
   - Omnichannel Lead Acquisition Donut Chart.
   - Pipeline Funnel Stage breakdown.
   - Daily Priority Follow-ups table with overdue alerting.
   - Recent Executed Bookings & Real-time Immutable Activity Log.
3. **Database Architecture & Migrations**:
   - Full PostgreSQL migration scripts in `supabase/migrations/`.
   - Concurrency-safe unit locking via `reserve_unit_transactional`.
   - Bidirectional unit reservation check invariant.
   - Immutable audit trail in `lead_activities`.
   - Comprehensive synthetic demo seed dataset.

---

## Getting Started

### 1. Prerequisites
- Node.js v18+ (tested on v24.15.0)
- npm v9+

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_ENABLE_MOCK_FALLBACK=true
```
*Note: If Supabase credentials are not supplied, AUREVIA automatically runs in Demo Mode with realistic synthetic Indian real estate data.*

### 3. Installation & Run
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Build for production
npm run build
```

---

## Modules Roadmap
- [x] **Phase 1**: Application Foundation, Navy Shell & Executive Dashboard
- [ ] **Phase 2**: Property Project Master & Interactive Unit Matrix (Stacking Chart)
- [ ] **Phase 3**: Omnichannel Lead Hub & Activity Drawer
- [ ] **Phase 4**: Visual Sales Pipeline (Kanban) & Follow-ups Engine
- [ ] **Phase 5**: Site Visits, Bookings & Employee Target Console
- [ ] **Phase 6**: Enterprise Governance, Production RLS Audit & Final Verification

