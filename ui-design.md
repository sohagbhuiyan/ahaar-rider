# AHAAR Rider App — UI/UX Design Guidelines

## 1. Design Goal

Create a premium, modern, clean, minimal, and highly functional food-delivery rider application tailored for catering and daily operations.

Prioritize usability, high contrast, glanceability, accessibility, and fast field interactions.

## 2. Brand Identity & Design Tokens (Rider Palette)

| Token | Color | Usage |
|---|---|---|
| **Primary** | `#FF7A00` | Main brand actions, active navigation, key highlights |
| **Secondary** | `#E04E0C` | Strong accents, selected emphasis, important actions |
| **Text** | `#1F1F1F` | Main text and headings |
| **Background** | `#FFFFFF` | Main screen background |
| **Surface** | `#FFF1E6` | Soft cards, grouped sections, subtle highlighted areas |

### Contrast Rules
* Do not use white text on `#FF7A00` for normal-sized text; its contrast is insufficient.
* Prefer `#1F1F1F` text/icons on `#FF7A00`.
* White text on `#E04E0C` is suitable for prominent badges and hero cards.
* Use accessible contrast for all text, icons, borders, and interactive states.
* Do not use brand orange to communicate every status. Use separate semantic status colors.

### Semantic Status Colors
* **Status Success (Online/Delivered):** `#059669` (Emerald, soft: `#ECFDF5`)
* **Status Warning (Pending/Under Review):** `#D97706` (Amber, soft: `#FFFBEB`)
* **Status Danger (Wrong Bag/Rejected):** `#DC2626` (Red, soft: `#FEF2F2`)
* **Status Info (En Route/Navigating):** `#2563EB` (Blue, soft: `#EFF6FF`)
* **Disabled / Inactive:** `#8C8C8C` / `#E5E7EB`

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
