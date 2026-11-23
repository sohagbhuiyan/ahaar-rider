Act as a Senior Full-Stack Software Engineer and Software Architect. Audit and implement a complete, production-ready, dual-track delivery management system with Firebase Cloud Messaging (FCM) notifications across my existing AHAAR ecosystem.

### Repositories & Stack

- `ahaar-backend` — Laravel API + MySQL (shared backend)
- `ahaar` — Next.js Customer Website + Admin Panel
- `ahaar-app` — Expo Customer Mobile App
- `ahaar-rider` — Expo Delivery Rider App

---

### Core Functional Requirements

#### 1. Remove Existing Badge Verification & Enforce Strict QR Scope

- Completely remove the existing badge-based delivery verification system across both Instant Orders and Subscriptions (obsolete DB tables/columns, API checks, and UI components).
- **Strict QR Scope Rule:**
  - **Subscription / Meal-Plan Runs (Car Riders ONLY):** Use the POS Thermal Sticker + 24-hour Token QR workflow below.
  - **Instant Orders (Bike Riders):** **Do NOT generate, print, or require QR codes.** Use a fast, standard in-app status flow (`ACCEPTED` → `PICKED_UP` → `ON_THE_WAY` → `DELIVERED`, with optional delivery proof/note if supported).
- **No Permanent Box Binding:** Meal boxes are interchangeable and not permanently bound to fixed IDs. Generate a fresh per-delivery QR token and printable POS sticker for each scheduled subscription delivery job.

#### 2. Dual-Track Delivery Architecture (`BIKE` vs. `CAR`)

Route deliveries strictly by `vehicle_type` on the Rider profile:

- **Bike Riders (`BIKE`) — Instant Orders Only:**
  - Flow: `PENDING` → `ACCEPTED` → `PREPARING` → `READY_FOR_PICKUP` → `RIDER_ASSIGNED` → `PICKED_UP` → `ON_THE_WAY` → `DELIVERED`.
  - Auto-assign or offer orders to eligible online Bike riders based on branch, availability, location, and workload.
  - Handle rejection, offer timeout, reassignment, cancellation, and failed deliveries using race-safe DB transactions to prevent duplicate or conflicting assignments.
- **Car Riders (`CAR`) — Slot-Wise Subscription Runs Only:**
  - Generate daily delivery jobs via **Laravel Scheduler** from active subscriptions, strictly respecting existing skip, pause, swap, branch, and date rules.
  - **Strict Slot Separation:** `BREAKFAST`, `LUNCH`, and `DINNER` must always be separate runs—never combine meal slots into one run.
  - Group jobs by date, branch/zone, and meal slot. Admin creates/manages runs and assigns approved, available Car riders.
  - A run activates when Admin/Kitchen marks that meal-slot batch `READY`.
  - **Loading Scan:** Car rider scans each package's QR sticker while loading. Backend validates the package belongs to the assigned run, branch, slot, and rider—showing loading progress, missing packages, duplicate scans, and wrong-run warnings. Allow starting the run after full load or an authorized, audit-logged Admin override.
  - **Drop-off & Quick Scan Box:** Rider completes each customer stop individually by scanning the package QR before marking `DELIVERED` (with optional proof/notes). Include a prominent floating **"Quick Scan Box"** button in the Car Rider UI so the rider can scan any box in the vehicle to instantly view that customer's stop #, food items, phone (1-tap call), full address, delivery notes, and Google Maps navigation.
  - Support failed deliveries, skipped stops, rescheduling, cancellation, and reassignment.

#### 3. POS Thermal Sticker Printing & 24-Hour Auto-Expiring Token QR (Subscription Runs ONLY)

- **Token Generation:** When Admin marks a subscription meal-slot batch `READY`, generate a unique, opaque short token per delivery job (e.g., `AHR-9X4K2M`). **Never embed raw customer PII inside the QR code payload.**
- **Admin POS / Thermal Sticker Print View (`ahaar`):**
  - Provide a one-click **"Print POS Labels"** view per slot run formatted cleanly via `@media print` for standard **58mm / 80mm thermal POS and sticker printers** (easy-peel stickers or sleeve labels).
  - Each printed label displays: Branch/Zone, Meal Slot, Stop #, Customer Name, Short Address, Food Items, optional masked phone (e.g., `017****5180`), and the **Token QR Code** for instant visual picking + fast scanning.
- **Authenticated Rider Scan (`GET /api/rider/delivery/scan/{token}`):**
  - Only logged-in Car Riders assigned to that active run can resolve the token via Laravel API.
  - Validates rider authorization, assigned run, slot, branch, status, and token validity; returns full customer details, food items, 1-tap call number, address, notes, and coordinates.
- **24-Hour Auto-Expiry & Immediate Revocation:**
  - Tokens automatically expire after a maximum of **24 hours** and are purged via **Laravel Scheduler**.
  - Revoke tokens immediately upon successful delivery, cancellation, or invalidation (`410 Gone` / invalid response on rescan).
  - Retain permanent delivery audit logs even after expired QR tokens are deleted. Prevent replay, duplicate loading, and duplicate delivery confirmation.

#### 4. Event-Driven FCM Notification System

- Use the existing AHAAR Firebase setup and Laravel backend to notify Customer Web, Customer App, Rider App, and Admin Panel.
- Trigger notifications on key backend state changes: new order, accepted/rejected, preparing, ready for pickup, rider assignment, pickup, on the way, subscription run assigned/started, delivered, failed delivery, and cancellation.
- **Async Batch Dispatch:** Dispatch bulk Car run notifications (e.g., 30+ subscribers notified when a run starts) asynchronously via **Laravel Queues (Jobs)** so API requests stay fast and non-blocking.
- Handle multi-device `fcm_token` storage, token refresh, deduplication, foreground/background handling, and deep-links to the exact order or run screen.
- Backend status changes remain the single source of truth; notifications must never mutate state.

#### 5. Admin Delivery Operations (`ahaar`)

- Unified, clean dashboard for Instant Orders (live status, rider assignment/reassignment) and Subscription Runs (grouped by date, branch, meal slot).
- One-click "Mark Slot Ready & Print POS Labels", Car run assignment/reassignment, rider online/offline & workload visibility, loading progress, completed/pending/failed stops, delivery history, exception handling, and audit-logged Admin overrides.

---

### Architecture & Safety Rules

- **Audit First:** Inspect existing tables, models, APIs, auth, subscription logic, badge verification, FCM setup, and UI before proposing changes. Reuse and extend existing architecture—never introduce duplicate tables or parallel systems.
- **No Regressions:** Preserve existing order, payment, subscription (skip/pause/swap), and **BN/EN/AR localization + RTL support**.
- Enforce a clear delivery state machine, transactional race-safe operations, proper DB indexes, pagination, validation, authorization, and audit trails.

---

### Execution Plan (Work Strictly Phase-by-Phase)

Do **not** implement all 4 repositories in a single response. Follow these 4 phases in order:

- **Phase 1 — Audit & Architecture Plan (STOP after this phase for my approval):**
  Audit all 4 repos and present: (a) what will be reused vs. removed (badge verification), (b) DB migrations & delivery state machine, (c) Laravel API endpoints, Queue jobs & Scheduler tasks, and (d) UI/UX plan per app including the 58mm/80mm POS label template. **Wait for my confirmation before writing code.**
- **Phase 2 — `ahaar-backend` (Laravel + MySQL):**
  Implement migrations, badge removal, dual-track dispatch, Subscription-only 24h QR generation/verification/revocation, Laravel Queues for FCM, Laravel Scheduler jobs, and feature tests (concurrency, duplicate scans, 24h expiry, cancellations, failed stops).
- **Phase 3 — `ahaar` (Next.js Admin Panel + Customer Web):**
  Implement Admin delivery ops, slot run management, 58mm/80mm POS thermal label print view, live order tracking, and Web FCM integration (preserving BN/EN/AR + RTL).
- **Phase 4 — `ahaar-rider` & `ahaar-app` (Expo Mobile Apps):**
  Implement vehicle-aware Rider UI (Bike instant flow with no QR + Car loading scan, drop-off scan, and floating Quick Scan Box button), Customer live tracking, and Expo FCM with deep-links.

After each phase, report what was implemented, changed, removed, any migration/queue/cron commands to run, and remaining manual configuration steps.
