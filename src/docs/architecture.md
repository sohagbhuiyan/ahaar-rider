# AHAAR Rider & Delivery System — Architecture

## 1. Purpose

This document defines the target architecture for the AHAAR Rider & Delivery Management System.

The existing Laravel backend and database remain the single source of truth. The Rider App is a separate Expo application. The existing Next.js Admin Panel is extended without redesigning its UI.

**Important:** The current implementation must be inspected before any schema, route, or technology decision is finalized. This document is an architecture guide, not permission to replace working systems.

## 2. System Components

- **Customer App:** Existing Expo application. Continues to create orders and manage customer-facing workflows.
- **AHAAR Website:** Existing Next.js application. No unrelated redesign or breaking API changes.
- **Admin Panel:** Existing Next.js admin interface. Add rider and delivery features using its current layout and components.
- **Laravel Backend:** Authentication, authorization, rider profiles, document verification, restaurants, orders, subscription schedules, delivery assignment, status transitions, notifications, and audit records.
- **Database:** Reuse the existing database and entities wherever appropriate. Do not create a separate Rider database.
- **Rider App:** New Expo Router application named `ahaar-rider`.
- **Push Notifications:** Expo Push Notifications, sent by backend jobs/services.
- **Location:** Device location is submitted to Laravel under explicit rider permissions and availability rules.

## 3. Architecture Discovery — Mandatory Before Coding

Inspect and document:

1. Laravel version, PHP version, database engine/version, queue driver, scheduler, storage configuration, authentication package, and authorization approach.
2. Existing User model, roles, guards, tokens/sessions, and API middleware.
3. Existing Order, Restaurant/Branch, Plan, Subscription, Meal, Address, Payment, and delivery-related models/tables.
4. Existing order creation and subscription activation flows.
5. Existing Next.js Admin Panel routes, layouts, components, permissions, data-fetching conventions, and design tokens.
6. Existing Expo Customer App SDK version, navigation, API client, authentication, notification setup, and location-related dependencies.
7. Existing deployment setup and production limitations.

Create an inspection report listing existing entities and relationships. Do not assume a table, field, route, package, or framework version exists until verified.

## 4. Logical Domain Modules

Organize implementation around these responsibilities, adapting naming to existing project conventions:

- Rider identity and profile
- Rider vehicle
- Rider legal documents and verification
- Rider availability and location
- Restaurant/branch coordinates
- Delivery records and status history
- Delivery assignment and assignment history
- Subscription delivery schedules
- Push notification registration and dispatch
- Proof of delivery
- Admin audit trail

Prefer clear service boundaries and small, testable units. Avoid introducing a new architectural framework or unnecessary abstraction.

## 5. Core Relationships

The final schema must be based on inspection. The intended logical relationships are:

- A rider profile belongs to an authenticated user, unless the existing user model already supports rider identity cleanly.
- A rider has one active approved vehicle configuration at a time; vehicle changes require Admin approval and an audit record.
- A rider can have multiple legal documents, each with document type, identifying metadata where required, issue/expiry dates, verification status, and private file reference.
- An order belongs to or references a restaurant/branch.
- A delivery references its source order or subscription schedule and its restaurant/branch.
- A delivery may have assignment history; only one active rider assignment is allowed at a time.
- A subscription can have multiple individual scheduled deliveries.
- A delivery has status history and, where applicable, proof-of-delivery records.
- A rider can have multiple device push tokens.

Use foreign keys, indexes, uniqueness constraints, and deletion rules appropriate to existing data and business requirements.

## 6. Backend Responsibilities

Laravel must be authoritative for:

- Rider approval and eligibility.
- Document validity and expiry restrictions.
- Vehicle-to-delivery compatibility.
- Restaurant selection/association.
- Delivery creation and idempotency.
- Automatic and manual assignment.
- Atomic acceptance and reassignment.
- Delivery status transitions.
- Proof-of-delivery validation.
- Push notification dispatch.
- Audit history.

Never rely on frontend filtering or hidden UI controls as a security boundary.

## 7. Automatic Assignment Flow

1. An existing order/subscription event is committed successfully.
2. A backend listener/job creates the required delivery record idempotently.
3. The delivery is linked to the correct restaurant/branch.
4. Backend determines delivery category:
   - Regular/daily order → Bike only.
   - Plan/subscription delivery → Car only.
5. Backend filters riders by approval, active status, valid required documents, online status, vehicle compatibility, location freshness, and workload/capacity.
6. Eligible riders are ranked by distance and configured business rules.
7. Notify a configured batch of nearby riders.
8. The first valid acceptance wins through a database transaction and row-level lock or an equivalent safe concurrency strategy supported by the database.
9. If no rider accepts before timeout, continue to the next batch or make the delivery available for Admin intervention.
10. Record each attempt and assignment event.

Do not hold a database transaction open while sending network requests. Dispatch notifications after the relevant database transaction commits.

## 8. Manual Assignment Flow

- Admin selects an unassigned or eligible reassignment candidate.
- Backend revalidates rider approval, document validity, online/availability policy, vehicle type, branch/delivery constraints, and current assignment.
- Backend atomically assigns the delivery and writes assignment history.
- Any pending automatic assignment attempts are invalidated or made harmless.
- Notify the rider after commit.
- Record the Admin actor and reason for manual assignment/reassignment.

## 9. Rider App Responsibilities

The Rider App handles presentation and user interaction:

- Registration and secure document submission.
- Login through the existing approved authentication approach.
- Application and document status.
- Online/offline controls.
- Location permission and location updates.
- Delivery request and detail screens.
- Accept, pickup, start, and completion actions.
- Proof-of-delivery capture/OTP flow.
- Delivery history and profile.

The app must not decide final eligibility or assignment outcomes.

## 10. Admin Panel Integration

Extend existing Admin routes and components. Preserve current sidebar, navigation, typography, spacing, colors, layout, and component patterns. Add only the necessary navigation entries, screens, tables, filters, forms, detail views, and actions.

## 11. Reliability and Operations

- Use queues for push notifications and non-immediate background tasks.
- Configure scheduler jobs for document expiry checks, assignment timeouts, and due subscription schedules where needed.
- Use idempotency keys/unique constraints to prevent duplicate deliveries.
- Use `Asia/Riyadh` for business scheduling and store timestamps consistently (prefer UTC storage if compatible with the existing system).
- Define retry limits, failed-job handling, logging, and monitoring.
- Ensure location updates are rate-limited and do not unnecessarily drain battery.
- Keep private documents out of public storage and public URLs.

## 12. Architecture Deliverables

Before implementation, produce:

- Existing architecture inventory.
- Current database relationship summary.
- Proposed schema changes with reasons.
- API contract proposal.
- Authentication and authorization flow.
- Delivery assignment sequence diagram or written flow.
- Deployment dependencies and risks.
- Phased implementation and rollback plan.

Update this document when implementation decisions differ from the proposed architecture.
