# AHAAR Rider App & Delivery System — Project Audit

**Document:** `docs/project-audit.md`  
**Date:** November 2026  
**Auditor:** Senior Software Architect & Delivery Operations Consultant  
**Status:** Complete  

---

## 1. Executive Summary

A comprehensive, code-level investigation of all four projects in the AHAAR ecosystem was performed:
1. `ahaar-backend`: Laravel 12 / PHP 8.2+ API backend with MySQL / SQLite.
2. `ahaar`: Next.js 15 Admin Operations Dashboard and public web application.
3. `ahaar-app`: Production customer mobile application (Expo SDK 57, React Native 0.86, NativeWind 4).
4. `ahaar-rider`: Greenfield rider mobile application (Expo SDK 57, React Native 0.86, NativeWind 4, currently a static prototype).

### Key Audit Conclusions
* **Strong Subscription Engine Already Built:** `ahaar-backend` has a mature subscription scheduling engine (`DeliveryService`), meal customization/swap mechanism (`MealSwap`), cutoff locking job (`LockCutoffDeliveriesJob`), and kitchen aggregations (`KitchenChartService`).
* **The "Cutoff Wall":** After daily deliveries lock at cutoff time (`status = 'locked'`), the system ceases automated operations. There is no route batching, vehicle assignment, rider dispatching, or package tracking.
* **Vehicle Type Separation:** The business rule strictly dictates:
  - **Car:** Exclusively for multi-stop subscription catering deliveries (7, 15, 30 days).
  - **Bike:** Exclusively for point-to-point on-demand instant orders.
  This separation is not yet modeled in the backend or exposed in the API.
* **Three-Way Branding & UI Conflict Discovered:**
  - `ahaar` (Web/Admin) and `ahaar-app` (Customer): Canonical Magenta/Pink `#FF2B85` (`brand[500]`), navy `#1A1A2E`, soft `#FFF0F7`.
  - `ahaar-rider/ui-design.md`: Stated Orange `#FF7A00` / `#E04E0C` while saying *"Use pink strategically"*.
  - `ahaar-rider/src/lib/theme.ts`: Coded with Forest Green (`#347650`, `#24613f`).
  *Resolution:* Must unify `ahaar-rider` to the canonical `#FF2B85` design tokens from `ahaar-app/src/lib/tokens.js`.
* **Missing Branch Concept:** While business rules require supporting "all three existing AHAAR branches", the existing database has no `branches` table, model, or foreign key. Operations currently assume a single central kitchen.

---

## 2. Technology Stack & Installed Versions

| Component | `ahaar-backend` | `ahaar` (Admin & Web) | `ahaar-app` (Customer App) | `ahaar-rider` (Rider App) |
| :--- | :--- | :--- | :--- | :--- |
| **Framework** | Laravel `12.0` / PHP `^8.2` | Next.js `15.x` (App Router) | Expo SDK `~57.0.26` | Expo SDK `~57.0.26` |
| **Runtime / UI** | PHP 8.2+ | React 19 / TypeScript | React Native `0.86.3` / React `19.2.3` | React Native `0.86.3` / React `19.2.3` |
| **Styling** | N/A | Tailwind CSS 3 / shadcn/ui | NativeWind `^4.2.6` / Tailwind 3.4 | NativeWind `4.2.7` / Tailwind 3.4 |
| **Navigation** | Laravel Route Collections | Next.js App Router | Expo Router `~57.0.24` | Expo Router `~57.0.24` |
| **State & API** | Eloquent ORM | TanStack React Query 5 / Axios | TanStack React Query 5 / Zustand / Axios | `useSyncExternalStore` (Mock store only) |
| **Auth** | Laravel Sanctum `^4.3` | NextAuth v5 (Beta) + Bearer tokens | Sanctum Bearer Token via `expo-secure-store` | **None** (Static mock user) |
| **Roles / Perms**| `spatie/laravel-permission` `^7.4` | Role-based layout gates (`admin`, `finance`, `kitchen`, `ops`) | Role agnostic (customer) | **None** (Rider role not yet seeded) |
| **Push / Notify**| `laravel-notification-channels/fcm` `^6.1` (Configured, no classes) | N/A | None implemented | None implemented |
| **Location / Maps**| Google Maps API + Nominatim OSM | Google Maps JS API | `expo-location` `~57.0.20`, `react-native-maps` `1.27.2` | Mock SVG map overlay |
| **Camera / QR** | N/A | N/A | N/A | **None installed** |

---

## 3. Database Schema, Models & Relationships Assessment

### 3.1 Existing Models (`ahaar-backend/app/Models`)
* `User`: Authenticatable, `HasRoles`, `HasApiTokens`, `SoftDeletes`. Seeded roles: `admin`, `finance`, `kitchen`, `ops`, `customer`. **Missing: `rider` role.**
* `DailyDelivery`: One row per subscription meal per day. Statuses: `scheduled`, `locked`, `delivered`, `paused`, `skipped`. Columns: `subscription_id`, `delivery_date`, `slot_id`, `address_id`, `delivery_address` (JSON snapshot), `is_customized`, `cutoff_at`, `locked_at`, `delivered_at`.
* `DailyDeliveryItem`: Line items on the meal plate (`plan`, `customization`, `extra`, `guest`). Tracks `original_menu_item_id`, `swap_locked_at`, `wasSwapped()`.
* `Order`: Standalone instant orders (`type = instant`), add-ons (`type = extra`), guest portions (`type = guest`). Statuses: `pending`, `confirmed`, `delivered`, `cancelled`.
* `OrderItem`: Products attached to an `Order` (`menu_item_id`, `package_id`, `quantity`, `unit_price`, `total_price`).
* `Subscription`: 7, 15, or 30-day plan coverage. Has many `DailyDelivery`, belongs to `Plan` and `User`.
* `Address`: Includes `lat`, `lng`, `area`, `line1`, `instructions`, and Saudi National Address columns (`building_number`, `street_name`, `district`, `postal_code`, `additional_number`).
* `DeliverySlot`: Slot definitions (e.g., Breakfast, Lunch, Dinner) with `start_time`, `end_time`, and `cutoff_hours`.

### 3.2 Missing Database Entities (Must be added)
1. **`branches` Table:**
   - Required to satisfy: *"The system must support all three existing AHAAR branches."*
   - Fields: `id`, `name`, `code` (`RUH-01`, etc.), `phone`, `email`, `lat`, `lng`, `radius_km`, `address`, `is_active`.
2. **`driver_profiles` Table:**
   - Extends `User` when role is `rider`.
   - Fields: `user_id`, `branch_id`, `vehicle_type` (`car`, `bike`), `vehicle_plate`, `license_number`, `approval_status` (`pending`, `approved`, `rejected`, `suspended`), `is_active` (online toggle), `is_busy`, `current_lat`, `current_lng`, `last_location_at`.
3. **`driver_documents` Table:**
   - Tracks required onboarding and compliance paperwork.
   - Fields: `driver_profile_id`, `document_type` (`national_id`, `driving_license`, `vehicle_registration`, `health_certificate`), `file_path`, `expiry_date`, `status` (`pending`, `verified`, `rejected`), `rejection_reason`.
4. **`delivery_runs` Table (Car Batches):**
   - For multi-order subscription catering routes.
   - Fields: `id`, `run_code`, `branch_id`, `driver_id`, `slot_id`, `delivery_date`, `status` (`draft`, `ready`, `dispatched`, `completed`), `started_at`, `completed_at`.
5. **`daily_deliveries` Schema Additions:**
   - `branch_id` (foreignId -> `branches.id`, nullable).
   - `delivery_run_id` (foreignId -> `delivery_runs.id`, nullable).
   - `stop_sequence` (smallint, default 0).
   - `verification_code` (varchar 16, unique/indexed for QR code generation).
   - `pod_type` (`handed_to_customer`, `doorstep`, `reception`, `security_gate`).
   - `pod_photo_url` (varchar 2048, nullable).
   - `failed_reason` (varchar 255, nullable).
   - Extend status enum to support: `packed`, `out_for_delivery`, `failed_attempt`, `returned`.
6. **`orders` Schema Additions (For Bike Instant Orders):**
   - `branch_id` (foreignId -> `branches.id`, nullable).
   - `driver_id` (foreignId -> `users.id`, nullable).
   - `verification_code` (varchar 16).
   - `dispatched_at`, `delivered_at`, `pod_photo_url`.

---

## 4. Existing APIs & Endpoints Assessment

### 4.1 What Exists in Backend (`ahaar-backend/routes`)
* `api_auth.php`: Login, register, password reset, phone OTP start/verify, Google auth tokens.
* `api_customer.php`: Customer profiles, addresses, catalog, subscriptions, deliveries schedule, swaps, instant orders, extra orders, guest orders.
* `api_admin.php`:
  - `GET /admin/kitchen/prep-chart` & `meal-chart` (Stove and packing aggregates).
  - `GET /admin/deliveries` & `PATCH /admin/deliveries/{id}/status`.
  - `GET /admin/orders` & `PATCH /admin/orders/{id}/status`.
  - Catalog, Plans, Users, Roles, Finance, Banners, Media.
* `api_webhooks.php`: Mollie/Stripe payment callbacks.

### 4.2 Missing API Layers
* **`routes/api_rider.php` (Completely Missing):**
  - No rider authentication / profile lookup.
  - No document upload endpoints.
  - No availability toggle (`online` / `offline`).
  - No GPS beacon endpoint (`POST /rider/location`).
  - No route manifest endpoint (`GET /rider/runs/today`).
  - No package verification endpoint (`POST /rider/deliveries/{id}/verify`).
  - No proof-of-delivery submission endpoint (`POST /rider/deliveries/{id}/complete`).
  - No failure/exception report endpoint (`POST /rider/deliveries/{id}/report-issue`).
* **Admin Dispatch API (`api_admin.php`):**
  - No endpoints for generating delivery runs, assigning drivers, or reviewing rider documents.

---

## 5. UI/UX & Component Assessment

### 5.1 Reusable Components in `ahaar-app/src/components/ui`
`ahaar-app` already contains a comprehensive, highly refined suite of NativeWind UI components:
* `Button.tsx`: Variants (`primary`, `secondary`, `outline`, `ghost`, `danger`), sizes (`sm`, `md`, `lg`), loading spinner integration.
* `Badge.tsx`: Pill badges with status variants (`success`, `warning`, `danger`, `info`, `muted`, `free`, `paid`).
* `Card.tsx`: Card surfaces with elevation and borders.
* `Input.tsx` & `PasswordInput.tsx`: Accessible, auto-validating text inputs.
* `Checkbox.tsx`: Accessible checkbox with animated checkmark.
* `Dialog.tsx`: Modal popups with scrim and keyboard avoiding behavior.
* `Sheet.tsx`: Bottom sheets for mobile interactions.
* `Skeleton.tsx` & `SkeletonText.tsx`: Content loading placeholders.
* `States.tsx`: `EmptyState`, `ErrorState`, `LoadingState` handlers.

*Strategy:* Copy these audited components directly from `ahaar-app` into `ahaar-rider/src/components/ui`. This guarantees 100% UI consistency, zero third-party component library bloat, and immediate productivity.

### 5.2 Branding Conflict Identification & Resolution
* `ahaar-app/src/lib/tokens.js` (Canonical):
  ```javascript
  const brand = { 500: '#ff2b85', 50: '#fff0f7', 700: '#d4006b' };
  const text = { primary: '#1a1a2e', secondary: '#6b7280', muted: '#9ca3af' };
  const surface = { DEFAULT: '#ffffff', secondary: '#fff0f7', muted: '#f9f9f9' };
  ```
* `ahaar-rider/ui-design.md` (Conflicted): Lists `#FF7A00` (Orange) but references pink highlights.
* `ahaar-rider/src/lib/theme.ts` (Conflicted): Lists `#347650` (Forest Green).
* **Architectural Decision:** Standardize `ahaar-rider` on the canonical `#FF2B85` design tokens from `ahaar-app`.

---

## 6. Risks, Assumptions & Compatibility Analysis

| Area | Risk / Assumption | Mitigation Strategy |
| :--- | :--- | :--- |
| **Branch Ambiguity** | Business rules require 3 branches, but database has none. | Create a `branches` table with 3 seeded branches (e.g. Riyadh Central, Riyadh North, Riyadh East) and add nullable `branch_id` foreign keys to ensure backward compatibility with existing single-branch data. |
| **Concurrency / Double Claiming** | Two riders attempting to accept the same order or route simultaneously. | Use database transactions with `lockForUpdate()` in Laravel service classes. Enforce state machines preventing transitions once assigned. |
| **Expo SDK Version Lock** | Upgrading packages carelessly breaks Expo SDK 57 / React Native 0.86.3. | Use `npx expo install` exclusively when adding `expo-camera`, `expo-location`, `expo-secure-store`, ensuring version alignment with SDK 57. |
| **Mobile Offline Operations** | Rider enters basement parking or elevator with no cellular signal while delivering. | Implement offline-first storage in Rider App: persist scanned state and PoD photo locally with timestamp and coordinates, sync in background when network returns. |
| **Battery Consumption from GPS** | Background GPS drain on rider devices. | Do not stream location continuously when idle. Broadcast location beacon every 20–30 seconds **only** while on an active delivery run or accepted order. |
