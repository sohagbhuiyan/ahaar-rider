# AHAAR Rider App — UI/UX Design System

## 1. Design Goal

Create a polished, production-quality Rider App that feels like part of the AHAAR product ecosystem.

The interface should be modern, warm, clear, minimal, accessible, and fast to use during delivery work. Do not produce a generic AI dashboard or decorate screens at the expense of usability.

## 2. AHAAR Brand Colors

Use these as the core design tokens:

| Token | Color | Usage |
|---|---|---|
| Primary | `#FF7A00` | Main brand actions, active navigation, key highlights |
| Secondary | `#E04E0C` | Strong accents, selected emphasis, important actions |
| Text | `#1F1F1F` | Main text and headings |
| Background | `#FFFFFF` | Main screen background |
| Surface | `#FFF1E6` | Soft cards, grouped sections, subtle highlighted areas |

### Contrast rules

- Do not use white text on `#FF7A00` for normal-sized text; its contrast is insufficient.
- Prefer `#1F1F1F` text/icons on `#FF7A00`.
- White text on `#E04E0C` is suitable for prominent buttons, but verify contrast for the actual font size and weight.
- Use accessible contrast for all text, icons, borders, and interactive states.
- Do not use brand orange to communicate every status. Use separate semantic status colors.

### Semantic colors

Define accessible semantic tokens for:
- Success
- Warning / expiring soon
- Error / rejected / failed
- Information
- Disabled / inactive

Choose and verify their exact values during implementation. Do not invent random colors per screen.

## 3. Visual Language

- Use a light, clean interface.
- Use orange as a purposeful accent, not as a full-screen background.
- Use white and warm off-white surfaces.
- Use subtle borders and restrained shadows.
- Keep spacing, radius, icon size, and typography consistent.
- Avoid excessive gradients, glassmorphism, decorative blobs, oversized cards, and unnecessary animations.
- Prefer clear hierarchy and compact, readable information.

## 4. Typography

- Inspect existing AHAAR app typography and reuse it where appropriate.
- Choose a highly readable font with good Android support.
- Establish consistent styles for page title, section title, body, helper text, labels, and captions.
- Use consistent line height and font weight.
- Support longer names, addresses, and translated content without clipping.

## 5. Layout and Interaction

- Follow Expo safe-area and keyboard behavior.
- Use touch targets appropriate for mobile use.
- Keep primary delivery actions easy to reach.
- Show clear loading, disabled, pressed, success, and error states.
- Confirm destructive or irreversible actions.
- Avoid hidden gestures for critical delivery operations.
- Use accessible labels and screen-reader-friendly controls.

## 6. Required Rider Screens

Design a consistent experience for:

1. Welcome / onboarding
2. Registration
3. Login
4. Personal information
5. Vehicle selection and details
6. Legal document upload
7. Application pending/rejected/approved status
8. Dashboard
9. Online/offline availability
10. Available delivery requests
11. Delivery details
12. Active delivery and status progression
13. Navigation handoff
14. Proof of delivery 
15. Delivery history
16. Rider profile
17. Vehicle and document details
18. Document expiry / re-verification
19. Notifications
20. Help / support and settings, if supported by the existing product

## 7. Dashboard UX

Show the most useful information first:

- Online/offline state.
- Today's delivery summary.
- Available requests.
- Current active delivery.
- Clear next action.
- Relevant notices such as document expiry or pending verification.

Avoid displaying metrics that the backend cannot reliably provide.

## 8. Delivery UX

Delivery details should clearly show:

- Delivery reference.
- Restaurant/branch and pickup information.
- Customer delivery address.
- Delivery type and scheduled time.
- Relevant customer contact action, subject to privacy rules.
- Current status and next permitted action.

Use clear status labels and prevent the UI from suggesting an action the backend will reject.

## 9. Document UX

- Clearly identify required and optional documents based on backend configuration.
- Show upload progress, accepted formats, and file-size limits.
- Show submitted, pending review, approved, rejected, and expired states.
- Explain rejection reasons and re-upload requirements.
- Never expose private document storage URLs in the UI.

## 10. Admin Panel UI Restriction

The existing AHAAR Admin Panel must not be redesigned.

Preserve its existing:
- Layout and sidebar
- Navigation structure and visual style
- Typography and colors
- Spacing and component patterns
- Tables, dialogs, forms, and interaction conventions

Add Rider and Delivery Management features by reusing existing components. Do not introduce a new dashboard template or unrelated visual system.

## 11. Design References

Use as inspiration, not as templates to copy:

- Mobbin: https://mobbin.com/
- Dribbble: https://dribbble.com/
- shadcn/ui: https://ui.shadcn.com/
- Tailwind Plus: https://tailwindcss.com/plus

Inspect the existing AHAAR Customer App and Admin Panel before finalizing the visual direction. Existing AHAAR screenshots and components take precedence over generic references.

## 12. UI Quality Checklist

Before considering a screen complete, verify:

- Consistent AHAAR colors and typography.
- No horizontal overflow or clipped content.
- Responsive behavior on common Android screen sizes.
- Correct safe-area and keyboard handling.
- Loading, empty, error, offline, and permission-denied states.
- Accessible contrast and touch targets.
- Consistent spacing and component behavior.
- No placeholder buttons or nonfunctional interactions.
- No unnecessary decoration or generic AI-generated patterns.
