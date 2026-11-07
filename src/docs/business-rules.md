# AHAAR Rider & Delivery — Business Rules

## 1. Mandatory Vehicle Rules

These rules are strict and must be enforced by Laravel on every relevant operation:

- **Bike riders:** Regular / daily one-time orders only.
- **Car riders:** Plan / subscription deliveries only.

The rules apply to:
- Automatic assignment.
- Manual Admin assignment.
- Rider acceptance.
- Reassignment.
- Any API or background job that attaches a rider to a delivery.

Do not rely on frontend filtering. The backend must reject incompatible assignments.

Vehicle type is selected during rider registration and stored in the rider profile. It is not requested at login. A rider cannot change vehicle type without Admin review and approval.

## 2. Rider Eligibility

A rider may go online, receive, or accept deliveries only when all applicable conditions are satisfied:

- Registration is approved.
- Rider is active and not suspended.
- Required legal documents are approved and unexpired.
- Vehicle type is approved.
- Rider is online and location is sufficiently recent for the assignment policy.
- Rider is not already occupied beyond configured workload/capacity.
- Rider meets any branch, schedule, or operational restrictions.

Admin suspension or required-document expiry must immediately prevent new assignments and acceptance. Define a safe policy for deliveries already in progress; do not silently abandon an active customer delivery.

## 3. Registration and Documents

Collect personal, contact, identity, driving-license, vehicle-registration, vehicle-number, profile-photo, and other required information based on the actual Saudi operating/legal arrangement.

For each document, track as applicable:
- Document type.
- Private file reference.
- Issue date.
- Expiry date.
- Verification status.
- Reviewer and review timestamp.
- Rejection reason.
- Re-upload/re-verification history.

Do not assume every document is legally required for every rider arrangement. Confirm the checklist against the actual operating model and applicable Saudi requirements before enforcing it.

Document states should distinguish at least:
- Missing
- Submitted / pending review
- Approved
- Rejected
- Expiring soon
- Expired

Sensitive files must be private and accessible only to authorized users.

## 4. Rider Approval Lifecycle

Suggested lifecycle:

`pending → approved`

Alternative outcomes:
- `pending → rejected`
- `approved → suspended`
- `suspended → approved/reactivated`, after authorized review
- Approved rider with expired/rejected required documents becomes ineligible until re-verification.

Record Admin actor, timestamp, and reason for every review/status change.

## 5. Restaurants and Branches

- Support the three AHAAR restaurant/branch locations.
- Each branch must have a verified address, latitude, longitude, and operational status.
- Every order/delivery must reference the correct branch.
- Reuse existing restaurant records if they already represent branches.
- Do not assign a delivery using a missing or unverified branch coordinate; provide an Admin exception path.

## 6. Delivery Categories

Determine delivery category from the actual source business entity, not from a client-supplied label alone.

- Regular/daily one-time order → Bike.
- Plan/subscription scheduled delivery → Car.

A subscription purchase may create multiple scheduled delivery records. Each eligible delivery date should have its own uniquely identifiable schedule/delivery record.

Use existing AHAAR plan configuration and subscription rules. Do not hardcode only 15 or 30 days if other durations are configured. Existing durations such as 7, 15, and 30 days must be handled according to the configured plan and business rules.

## 7. Subscription Scheduling

For each active subscription:

- Generate one individual delivery schedule for each eligible delivery date/meal according to existing AHAAR rules.
- Preserve start/end dates, selected meals, delivery slots, holidays/skipped days, cutoff rules, and customer address behavior already implemented.
- Link each schedule to the subscription, customer, and correct restaurant/branch.
- Each schedule is independently assignable and trackable.
- Prevent duplicate schedule creation using deterministic uniqueness/idempotency.
- Subscription deliveries are Car-only.

Do not assume one schedule per calendar day if the existing subscription supports multiple meals or different delivery frequencies. Inspect the current rules first.

## 8. Automatic Assignment

- Start assignment only after the source order/schedule is valid and committed.
- Find nearby eligible online riders using rider location and branch coordinates.
- Rank by distance, freshness, workload, and configured rules.
- Notify a configurable batch of nearest eligible riders.
- The first valid acceptance wins.
- Use database transactions/locking or an equivalent database-safe atomic mechanism.
- If no rider accepts before timeout, notify the next batch or leave the delivery available for Admin.
- Use configurable radius, batch size, timeout, and retry policy rather than hardcoded magic numbers.
- Record assignment attempts and outcomes.

If no eligible rider exists, the delivery must remain visible to Admin as unassigned and trigger an appropriate operational alert.

## 9. Manual Assignment and Reassignment

- Admin may assign an eligible rider manually.
- Backend rechecks all eligibility conditions at assignment time.
- Manual assignment must cancel or invalidate pending automatic offers.
- Reassignment requires a reason and must preserve previous assignment history.
- A rider must not retain access to a delivery after reassignment unless explicitly required for audit/history.
- Never allow two active riders for one delivery.

## 10. Delivery Status Lifecycle

Use a clear, validated state machine. Suggested lifecycle:

`available → assigned → accepted → picked_up → out_for_delivery → delivered`

Additional outcomes:
- `cancelled`
- `failed`

Define permitted transitions, actor permissions, and required metadata for every transition. For example:
- Rider can accept only an eligible available offer.
- Rider can mark pickup only after acceptance.
- Rider can start delivery only after pickup.
- Rider can complete only after required proof-of-delivery validation.
- Admin may perform authorized corrections/reassignments with an audit reason.

Keep status history with actor, timestamp, and relevant notes.

## 11. Proof of Delivery

Choose the method after inspecting customer verification capabilities:

- Prefer OTP verification if the existing customer app can securely display or deliver a one-time code.
- Otherwise use an approved proof method such as photo confirmation, with privacy and retention controls.
- Do not allow the rider app to mark a delivery completed without the configured proof requirement.
- Protect OTPs and proof files; do not expose them in logs or public URLs.

## 12. Location and Availability

- Ask for clear location permission and explain why it is needed.
- Update location at a sensible configurable interval while online/working.
- Avoid continuous background tracking when the rider is offline or when it is not operationally required.
- Store location timestamp and accuracy; stale or inaccurate locations must not be treated as current.
- Handle permission denial, GPS disabled, network loss, and app termination gracefully.
- Use `Asia/Riyadh` for business scheduling and handle stored timestamps consistently.

## 13. Notifications

Send notifications for:
- New delivery offer.
- Manual assignment.
- Reassignment or cancellation.
- Delivery changes relevant to the rider.
- Document expiry and re-verification.
- Approval, rejection, or suspension status changes.

Push notifications are best-effort delivery signals, not the source of truth. The app must refresh delivery state from Laravel when opened.

## 14. Admin Audit and Operational Controls

Audit:
- Registration review.
- Document approval/rejection.
- Suspension/reactivation.
- Vehicle type changes.
- Manual assignment/reassignment.
- Delivery status overrides.
- Branch location changes.

Admin actions must be permission-controlled and include actor, timestamp, and reason where appropriate.

## 15. Timezone and Customer Commitments

- Use `Asia/Riyadh` for restaurant operations and customer-facing delivery schedules.
- Preserve existing AHAAR cutoff times, meal windows, and subscription commitments.
- Avoid silently changing existing order or subscription behavior during rider-system implementation.
- Clearly handle daylight/time conversion and store timestamps consistently.

## 16. Acceptance Criteria

The system is not complete until tests prove:

1. Bike riders can only receive regular/daily orders.
2. Car riders can only receive plan/subscription deliveries.
3. Pending, rejected, suspended, or document-ineligible riders cannot go online or accept new deliveries.
4. Admin can review documents and approve/reject/suspend/reactivate riders.
5. Admin can manually assign only eligible riders.
6. Automatic assignment selects nearby eligible riders.
7. Concurrent acceptance results in exactly one active rider.
8. Subscription schedules are generated without duplicates and follow existing plan rules.
9. Delivery status transitions and proof-of-delivery rules are enforced.
10. Existing Customer App, Website, order, payment, subscription, and Admin functionality continues to work.
