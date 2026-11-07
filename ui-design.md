# AHAAR Rider App — UI/UX Design Guidelines

## 1. Design Goal

Create a premium, modern, clean, minimal, and highly functional food-delivery rider application tailored for catering and daily operations.

Prioritize usability, high contrast, glanceability, accessibility, and fast field interactions.

## 2. Brand Identity & Design Tokens (Unified)

Follow the canonical AHAAR brand identity established in `ahaar-app/src/lib/tokens.js` and `ahaar/src/app/globals.css`:

- **Primary Brand Color:** `#FF2B85` (AHAAR Signature Pink / Magenta)
- **Primary Dark:** `#D4006B`
- **Primary Light:** `#FF6AAB`
- **Primary Soft:** `#FFF0F7`
- **Text Primary:** `#1A1A2E` (Navy Charcoal)
- **Text Secondary:** `#4B5563`
- **Text Muted:** `#9CA3AF`
- **Background:** `#FFFFFF`
- **Surface Muted:** `#F9F9F9`
- **Border:** `#F0E0EA`
- **Status Success (Online/Delivered):** `#059669`
- **Status Warning (Pending/Cutoff):** `#D97706`
- **Status Danger (Wrong Bag/Offline):** `#EF4444`
- **Status Info (En Route):** `#2563EB`

Use `#FF2B85` strategically for primary actions, active tabs, and critical highlights.

## 3. Typography

- Use clean, modern system fonts (`System`, `ui-sans-serif`).
- High-contrast text hierarchy for readability in direct sunlight.
- Minimum tap target: 48px height for all interactive buttons.

## 4. Layout & Components

- Reuse audited components from `ahaar-app/src/components/ui` (`Button.tsx`, `Badge.tsx`, `Card.tsx`, `Input.tsx`, `Sheet.tsx`, `States.tsx`).
- Consistent safe-area insets, keyboard-avoiding views, and haptic feedback.
- Camera QR scanner overlay with audio/vibration feedback.

## 5. Rider App Screens

1. **Auth & Onboarding:**
   - Rider Login (Email/Phone + Password)
   - Rider Registration (Vehicle type selection, Branch selection)
   - Document Upload & Compliance Status
2. **Operations:**
   - Home Dashboard (Online/Offline shift switch, Daily earnings, Assigned route card)
   - Car Route Manifest (Sequenced stops, Kitchen bulk handover scanner)
   - Active Stop & Navigation (Deep-link to Google Maps/Waze, Customer dialer)
   - Bag QR Verification (Real-time camera match)
   - Delivery Confirmation (Proof-of-Delivery photo, Signature pad)
   - Delivery Exception (5-minute countdown, unreachable report)
   - Bike Mode: Available Instant Orders & Pickup Claim

## 6. Admin Panel Restrictions

The existing AHAAR Admin Panel must NOT be redesigned. Preserve its layout, sidebar, typography, and styling. Only extend operational views (Deliveries, Kitchen, Users) with needed rider dispatching actions using existing components.
