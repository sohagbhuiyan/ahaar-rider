# AHAAR Delivery System — Phased Implementation Plan

**Document:** `docs/implementation-plan.md`  
**Date:** November 2026  
**Auditor:** Senior Software Architect & Delivery Operations Consultant  
**Status:** Implementation Roadmap (Pending User Approval)  

---

## 1. Architectural Strategy

The implementation plan is designed to be **purely additive and non-breaking**. Existing customer journeys, web subscriptions, and financial flows will continue operating without interruption.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION PHASES                           │
└────────────────────────────────────────────────────────────────────────┘

  Phase 1: Backend Foundation & Multi-Branch Schema
  • Database migrations (branches, driver_profiles, delivery_runs)
  • Role seeding ('rider' role)
  • Authentication, document upload & compliance endpoints
                   │
                   ▼
  Phase 2: Kitchen Packaging & Label Printing Engine
  • Continuous thermal adhesive label generator (QR + Human ID)
  • One-click label printing from Admin Kitchen Packing Sheet
  • Automatic verification token generation
                   │
                   ▼
  Phase 3: Rider Mobile Application (ahaar-rider)
  • Port audited UI components and unified tokens from ahaar-app
  • Camera QR verification scanner & Photo Proof-of-Delivery
  • Car Route Manifest (sequenced stops) & Bike Instant Order modes
  • Offline queue and background sync engine
                   │
                   ▼
  Phase 4: Admin Dispatch & Real-Time Tracking
  • Route auto-clustering engine (by branch, slot, and area)
  • Admin Dispatch modal & Rider document review screen
  • Milestone tracking in Customer App (FCM Push + Reverb)
                   │
                   ▼
  Phase 5: Field Pilot & Production Hardening
  • Single-branch pilot (Branch 1) with 2 Car drivers and 1 Bike rider
  • End-to-end audit trail verification
  • Full rollout across all 3 branches
```

---

## 2. Phase 1: Backend Foundation & Schema Extension

### 2.1 Database Migrations (Laravel)
All migrations are non-destructive and additive:
1. `create_branches_table.php`: ID, name, code, lat, lng, radius_km, address, phone.
2. `create_driver_profiles_table.php`: Extends `users` with vehicle type, branch, plate, license, approval status.
3. `create_driver_documents_table.php`: File path, document type, expiry date, status, verification timestamps.
4. `create_delivery_runs_table.php`: Car batch manifest linking slot, branch, driver, and date.
5. `add_delivery_runs_and_verification_to_daily_deliveries.php`:
   - Adds `branch_id`, `delivery_run_id`, `stop_sequence`, `verification_code`, `pod_type`, `pod_photo_url`, `failed_reason`.
   - Safely extends status enum to include `packed`, `out_for_delivery`, `failed_attempt`, `returned`.
6. `add_branch_and_driver_to_orders.php`:
   - Adds `branch_id`, `driver_id`, `verification_code`, `dispatched_at`, `pod_photo_url`.

### 2.2 Seeders & Service Classes
* `BranchSeeder.php`: Seeds the 3 operational branches (e.g., Riyadh Central, Riyadh North, Riyadh East).
* `RiderRoleSeeder.php`: Adds `rider` role to Spatie permissions.
* `Services/Delivery/VerificationTokenService.php`: Generates cryptographically verifiable short tokens (`AH-482-L1`) for packages.
* `Services/Rider/RiderComplianceService.php`: Evaluates document validity and enforces automatic online/offline status.

### 2.3 Rider API Routes (`routes/api_rider.php`)
Register endpoints defined in `docs/api-contract.md`:
* Login, registration, document upload.
* Online/offline toggle with compliance guard.
* GPS beacon ingestion (`POST /rider/location`).

---

## 3. Phase 2: Kitchen Packaging & Label Printing

### 3.1 Backend Label Generation
* Add `KitchenLabelService.php`: Formats printable ESC/POS or HTML label streams containing:
  - Branch and meal slot badge (e.g. `[LUNCH 12:00-14:00]`).
  - Route ID & Stop Sequence (e.g. `ROUTE CR-04 | STOP #07`).
  - Customer name, district (`area`), and specific address.
  - Meal item breakdown with swapped dish highlights (`was_swapped`).
  - Signed QR Code holding the delivery verification payload.

### 3.2 Admin Kitchen Sheet Enhancement (`ahaar/src/app/[locale]/admin/operations/kitchen/page.tsx`)
* Add **"Print Bag Label"** button to each individual customer card on the Packing tab.
* Add **"Print All Labels for Slot"** toolbar button: Generates a browser print view formatted specifically for continuous 3"x2" or 4"x2" thermal sticker paper.
* Zero additional hardware required — works with standard USB/network thermal printers already in use.

---

## 4. Phase 3: Rider Mobile Application (`ahaar-rider`)

### 4.1 Dependency Setup (Strict Expo SDK 57 Compatibility)
Install required packages using `npx expo install` to guarantee compatibility with React Native 0.86.3:
```bash
npx expo install expo-camera expo-location expo-secure-store @react-native-async-storage/async-storage
pnpm add axios @tanstack/react-query zustand clsx tailwind-merge sonner-native zod
```

### 4.2 Component & Token Integration
* Copy canonical design tokens (`src/lib/tokens.js`) and theme definitions from `ahaar-app`.
* Port verified UI components from `ahaar-app/src/components/ui`:
  - `Button.tsx`, `Badge.tsx`, `Card.tsx`, `Input.tsx`, `Sheet.tsx`, `States.tsx`.

### 4.3 Screen Development
1. **Authentication:** Login, Registration with vehicle type picker, Document upload screen with expiration pickers.
2. **Dashboard:** Online/Offline shift switch, today's summary card, active route preview.
3. **Car Mode (Subscription Manifest):**
   - Sequenced stop timeline.
   - Bulk Kitchen Handover scanner (scans 10–18 bags in under 45 seconds).
   - Stop detail screen with direct "Navigate" link to Google Maps / Waze.
   - Camera QR verification screen (validates bag matches destination).
   - Proof-of-Delivery screen (Photo capture + GPS stamp).
   - Unreachable customer exception flow (5-minute timer + photo).
4. **Bike Mode (Instant Orders):**
   - Available orders list.
   - Order claim with real-time feedback.
   - Kitchen pickup confirmation and customer delivery PoD.
5. **Offline Queue Engine:**
   - Stores scans and PoD submissions in local storage when offline.
   - Automatically replays pending operations upon network reconnection.

---

## 5. Phase 4: Admin Panel Dispatch & Real-Time Tracking

### 5.1 Route Batching & Dispatching (`ahaar/src/app/[locale]/admin/operations/deliveries`)
* Add **"Generate Car Routes"** button to Deliveries Board:
  - Invokes `POST /api/v1/admin/delivery-runs/auto-generate`.
  - Groups locked deliveries by district (`area`) into batches of 12–18 stops.
* Add **"Assign Driver"** modal:
  - Displays online, approved Car riders for that branch.
  - One-click route assignment.

### 5.2 Rider Compliance Management (`ahaar/src/app/[locale]/admin/users`)
* Add a **Riders Tab** to the existing Users view:
  - Displays list of riders, their vehicle types, branches, and compliance status.
  - Review uploaded documents with 1-click "Verify" or "Reject with reason".

### 5.3 Customer Milestone Tracking (`ahaar-app/src/app/deliveries.tsx`)
* Enhance the delivery card with a 4-stage milestone progression bar:
  1. *Prepared in Kitchen*
  2. *Loaded in Delivery Car*
  3. *Next in Line (Driver heading to you)* — Displays active leg map with driver ETA
  4. *Delivered* — Displays Photo Proof-of-Delivery link

---

## 6. Testing & Regression Strategy

### 6.1 Backend Unit & Feature Tests (Pest / PHPUnit)
* **Vehicle Track Isolation Test:** Verifies that a Bike rider cannot claim a `DeliveryRun` and a Car driver cannot claim an instant `Order`.
* **Document Expiry Test:** Verifies that a rider with an expired document is automatically prevented from going online.
* **Pessimistic Locking Test:** Simulates concurrent requests claiming the same instant order; verifies only 1 succeeds.
* **Cutoff & Batching Test:** Verifies that `GenerateDeliveryRunsJob` correctly clusters stops by branch and district without dropping deliveries.

### 6.2 Mobile Application Testing
* **QR Scanner Speed Test:** Validate scanning speed across low-end and high-end Android/iOS devices.
* **Offline Recovery Test:** Simulate network disconnection during a delivery completion; verify data is persisted locally and syncs upon reconnect.
* **Geo-Fencing Test:** Verify that "Complete Delivery" is disabled if the device GPS is > 150m from the address pin.

### 6.3 Zero Regression Safeguards
* Existing `orders` and `daily_deliveries` endpoints remain 100% backward-compatible.
* All new database fields are nullable or have safe defaults.

---

## 7. Timeline & Resource Allocation

| Phase | Focus Area | Estimated Working Days | Key Milestone Deliverable |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Backend Foundations & Schema | Days 1 – 3 | Migrations run, `api_rider.php` auth & profile live |
| **Phase 2** | Kitchen Labeling Engine | Days 4 – 5 | Thermal label printing operational in Admin Kitchen view |
| **Phase 3** | Rider App Mobile Client | Days 6 – 10 | Complete Rider App with QR scanning, PoD & Offline sync |
| **Phase 4** | Admin Dispatch & Milestone Tracking | Days 11 – 13 | Route batching in Admin + Customer App milestone tracking |
| **Phase 5** | Pilot & Production Hardening | Days 14 – 15 | Live pilot with Branch 1 drivers; zero-defect sign-off |
