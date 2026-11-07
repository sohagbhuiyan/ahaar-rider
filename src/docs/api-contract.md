# AHAAR Rider & Delivery — API Contract

## 1. Purpose and Rules

This document describes the API contract to be designed after inspecting the existing Laravel API.

**Do not blindly create these exact routes.** First inspect existing route naming, API versioning, authentication, response envelopes, validation format, and permission middleware. Reuse existing conventions and map the capabilities below to the actual project.

Laravel remains the single source of truth. The Rider App and Admin Panel must use backend APIs; neither should directly access the database.

## 2. API Contract Deliverables

Before implementation, document for every relevant endpoint:

- HTTP method and route.
- Authentication requirement and allowed role.
- Request parameters/body.
- Validation rules.
- Success response.
- Error responses and HTTP status codes.
- Authorization and business-rule checks.
- Idempotency/concurrency behavior where applicable.

Use the existing API version prefix and response format.

## 3. Rider Capabilities

The backend must provide equivalent capabilities for:

### Registration and profile
- Submit rider registration and personal information.
- Select Bike or Car during registration.
- Upload required legal and vehicle documents securely.
- Read own application and verification status.
- Read own profile, approved vehicle, and document expiry information.
- Request a vehicle change through an Admin-reviewed process, if supported.

### Authentication
- Authenticate using the existing Laravel authentication approach.
- Return rider profile and permissions after authentication.
- Do not request vehicle type at login.
- Block delivery operations for pending, rejected, suspended, or ineligible riders.

### Availability and location
- Set online/offline status.
- Submit current location with timestamp and accuracy metadata where available.
- Register, refresh, and revoke Expo push tokens.
- Enforce server-side freshness and permission checks.

### Deliveries
- List eligible available deliveries.
- Read delivery details.
- Accept a delivery.
- Mark picked up.
- Start delivery.
- Complete delivery with required proof.
- Report a delivery issue/failure using allowed reasons.
- Read delivery history.

## 4. Admin Capabilities

The existing Admin Panel must have API capabilities to:

- List, search, filter, and view riders.
- Review private rider documents through authorized access.
- Approve or reject registration with reason.
- Suspend/reactivate riders with reason.
- Review document expiry and re-verification.
- View rider availability and last known location.
- List and filter deliveries by status, date, branch, and rider.
- Manually assign and reassign eligible riders.
- View assignment history and delivery status history.
- Manage branch coordinates and operational status, using existing restaurant management where possible.
- View relevant rider/delivery dashboard statistics.

## 5. Delivery Assignment Contract

All assignment operations must revalidate on the server:

- Delivery is still unassigned or eligible for reassignment.
- Rider is approved and active.
- Required documents are valid.
- Rider is eligible and available under the configured policy.
- Vehicle type matches delivery type.
- Rider has not exceeded configured workload/capacity.
- Restaurant/branch and delivery constraints are satisfied.

Vehicle mapping is mandatory:

| Delivery category | Eligible vehicle |
|---|---|
| Regular / daily order | Bike only |
| Plan / subscription delivery | Car only |

The accept operation must be concurrency-safe. If two riders attempt to accept simultaneously, only one may succeed. The other must receive a clear conflict response and refresh available deliveries.

## 6. Suggested Logical Endpoint Groups

Map these to existing project conventions after inspection; avoid duplicate endpoints if equivalent APIs already exist.

- Rider registration and profile
- Rider document upload and status
- Rider availability and location
- Rider device/push-token registration
- Available and assigned deliveries
- Delivery acceptance and status actions
- Proof-of-delivery verification
- Admin rider review and status management
- Admin delivery listing and assignment
- Assignment history
- Branch/restaurant location management

## 7. Security Requirements

- Apply authentication and role-based authorization to every protected route.
- Riders may only access their own profile, documents, and assigned/eligible delivery information.
- Admin document access must be permission-checked and audited.
- Validate file type, file size, content, and storage destination.
- Store documents privately; use short-lived authorized access where preview/download is needed.
- Never trust rider_id, vehicle_type, approval_status, delivery status, or price values supplied by the client.
- Rate-limit sensitive operations such as login, registration, OTP, and location updates as appropriate.
- Avoid exposing unnecessary customer personal information.
- Use consistent validation and error responses.

## 8. Idempotency and Concurrency

- Delivery creation from order/subscription events must be idempotent.
- Use database constraints as well as application checks to prevent duplicate schedules.
- Assignment and acceptance must use a transaction and database-appropriate locking/atomic update.
- Do not send push notifications until the relevant database transaction commits.
- Reassignment must preserve history and invalidate stale acceptance attempts.
- Define safe retry behavior for queued jobs and notification dispatch.

## 9. Example Error Cases

Document the actual response format used by the existing API for cases such as:

- `401` unauthenticated.
- `403` not approved, suspended, expired document, or forbidden action.
- `404` resource not found or not visible to this rider.
- `409` delivery already accepted/assigned or invalid concurrent state.
- `422` validation or business-rule failure.
- `429` rate limit exceeded.

Do not leak private document paths, internal exception details, or other users' information.

## 10. API Documentation and Testing

- Update the project's existing API documentation approach (OpenAPI/Swagger, Postman collection, or documented routes).
- Add feature tests for rider registration, document review, role access, vehicle restrictions, assignment, concurrency, status transitions, and proof of delivery.
- Add regression tests for existing customer order, payment, and subscription flows.
- Keep this file synchronized with the implemented routes and actual response schemas.
