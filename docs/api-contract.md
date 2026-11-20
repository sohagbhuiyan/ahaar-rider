# AHAAR Delivery System — API Contract Specification

**Document:** `docs/api-contract.md`  
**Date:** November 2026 (Updated with 5-Stage Verification Lifecycle)  
**Status:** Approved Specification  

---

## 1. Overview & Conventions

All endpoints adhere strictly to the existing Laravel `ahaar-backend` conventions:
* **Base URL:** `https://api.ahaar.store/api/v1` (or local `http://localhost:8000/api/v1`)
* **Authentication:** Bearer token via Laravel Sanctum (`Authorization: Bearer {token}`)
* **Standard Response Shape:**
  ```json
  {
    "data": { ... },
    "message": "Operation description"
  }
  ```
* **Error Response Shape:**
  ```json
  {
    "message": "Validation error or business failure explanation",
    "errors": {
      "field_name": ["Specific error message"]
    }
  }
  ```

---

## 2. Stage 1 — Rider Authentication & Basic Registration

### 2.1 Rider Login
* **`POST /api/v1/auth/rider/login`**
* **Request:**
  ```json
  {
    "email": "rider@ahaar.store",
    "password": "Password123!",
    "device_name": "Pixel_8_RiderApp"
  }
  ```
* **Response `200 OK`:**
  ```json
  {
    "data": {
      "token": "142|7B8...plainTextSanctumToken",
      "user": {
        "id": 42,
        "name": "Sami Khalid",
        "email": "rider@ahaar.store",
        "phone": "+966501234567",
        "roles": ["rider"]
      },
      "driver_profile": {
        "id": 18,
        "branch_id": 1,
        "branch_name": "Riyadh Central (Al Olaya)",
        "vehicle_type": "car",
        "approval_status": "pending_initial_approval",
        "rejection_reason": null,
        "is_active": false,
        "is_busy": false
      }
    },
    "message": "Logged in successfully"
  }
  ```

### 2.2 Stage 1: Basic Rider Registration
* **`POST /api/v1/auth/rider/register`**
* **Note:** Collects *only* basic personal information. Does *not* require sensitive identity or vehicle documents at this stage.
* **Request:**
  ```json
  {
    "name": "Tariq Mansoor",
    "email": "tariq@example.com",
    "phone": "+966559876543",
    "password": "SecurePassword2026!",
    "password_confirmation": "SecurePassword2026!",
    "branch_id": 1
  }
  ```
* **Response `201 Created`:**
  ```json
  {
    "data": {
      "token": "143|xY8...token",
      "user": {
        "id": 43,
        "name": "Tariq Mansoor",
        "email": "tariq@example.com",
        "phone": "+966559876543",
        "roles": ["rider"]
      },
      "driver_profile": {
        "id": 19,
        "branch_id": 1,
        "approval_status": "pending_initial_approval"
      }
    },
    "message": "Registration submitted. Waiting for initial Admin approval."
  }
  ```

---

## 3. Stage 2, 4 & 5 — Admin Review & Approval Endpoints

All admin endpoints need `Authorization: Bearer {admin_token}` (role `admin` or `ops`).
**Every action answers with the refreshed review sheet** (same shape as 3.2) in `data`, plus a human `message`, so the admin UI never has to guess the new state. Illegal transitions return `422` with `errors.status`.

### 3.1 Rider Queue
* **`GET /api/v1/admin/riders?status=&vehicle=&branch_id=&search=&page=&per_page=`**
* Riders waiting on an admin (`pending_initial_approval`, `under_review`) sort first.
* **Response `200 OK`:**
  ```json
  {
    "data": [{
      "id": 7,
      "user": { "id": 42, "name": "Tariq Mansoor", "email": "tariq@example.com", "phone": "+966501234567", "status": "active" },
      "branch": { "id": 1, "name": "Central Hub" },
      "approval_status": "pending_initial_approval",
      "next_action": "review_registration",
      "rejection_reason": null,
      "vehicle": { "vehicle_type": null, "vehicle_plate": null, "vehicle_model": null, "status": "not_submitted", "rejection_reason": null, "is_submitted": false, "verified_by": null, "verified_at": null },
      "documents_summary": { "required": 3, "approved": 0, "pending": 0, "rejected": 0, "expired": 0, "not_submitted": 3 },
      "registration_approved": false,
      "fully_verified": false,
      "is_active": false, "is_busy": false, "can_go_online": false,
      "created_at": "2026-11-20T12:06:40+01:00",
      "initial_approved_at": null,
      "submitted_for_review_at": null
    }],
    "meta": {
      "current_page": 1, "per_page": 30, "total": 1, "last_page": 1,
      "counts": { "all": 1, "pending_initial_approval": 1, "approved_for_documents": 0, "under_review": 0, "approved": 0, "rejected": 0, "suspended": 0, "expired_documents": 0 }
    }
  }
  ```
* `id` is the **driver_profile id** and is the `{id}` in every URL below.
* `next_action`: `review_registration` | `awaiting_documents` | `awaiting_resubmission` | `review_documents` | `ready_to_activate` | `none` | `attention_required` | `rejected` | `suspended`.

### 3.2 Rider Review Sheet
* **`GET /api/v1/admin/riders/{id}`** — everything in a queue row, plus:
  ```json
  {
    "initial_approver": "Admin",
    "documents": [{
      "id": 101, "document_type": "iqama", "title": "National ID / Iqama",
      "is_mandatory": true, "number_required": true,
      "status": "under_review",
      "document_number": "2498765432", "expiry_date": "2027-05-15",
      "file_url": "https://api.ahaar.store/storage/rider-documents/7/abc.jpg", "file_is_pdf": false,
      "rejection_reason": null, "is_expired": false, "uploaded_at": "2026-11-20T13:00:00+01:00",
      "verified_by": null, "verified_at": null
    }],
    "activation_checks": [
      { "key": "registration_approved", "label": "Initial registration approved", "passed": true },
      { "key": "documents_approved",    "label": "All mandatory documents approved", "passed": false },
      { "key": "documents_valid",       "label": "No document is expired", "passed": false },
      { "key": "vehicle_approved",      "label": "Vehicle information approved", "passed": false },
      { "key": "branch_assigned",       "label": "Operating branch assigned", "passed": true },
      { "key": "account_active",        "label": "Account active and not suspended or rejected", "passed": true }
    ],
    "can_activate": false,
    "history": [
      { "id": 9, "event": "registration_approved", "description": "Initial registration approved",
        "actor": "Admin", "actor_role": "admin", "reason": null,
        "from": "pending_initial_approval", "to": "approved_for_documents", "created_at": "2026-11-20T12:30:00+01:00" }
    ]
  }
  ```
* Document `status`: `not_submitted` | `submitted` | `under_review` | `approved` | `rejected` | `expired` (`under_review` and `expired` are derived, never stored).

### 3.3 Stage 2: Initial Review & Suspension
* **`POST /api/v1/admin/riders/{id}/initial-approval`** — `{ "action": "approve", "rejection_reason": null }`

| `action` | Allowed from | Result | Reason |
|---|---|---|---|
| `approve` | `pending_initial_approval`, `rejected` | `approved_for_documents`; records approver + time | — |
| `reject` | `pending_initial_approval`, `approved_for_documents`, `under_review` | `rejected`; rider sees the reason | **required** |
| `suspend` | any except `suspended` | `suspended`; forced offline | **required** |
| `reinstate` | `suspended` | back to where their progress puts them (never skips activation) | — |

### 3.4 Stage 4: Review One Document
* **`PATCH /api/v1/admin/riders/{id}/documents/{docId}`** — `{ "status": "rejected", "rejection_reason": "Photo is blurry." }`
* `status`: `approved` | `rejected`; `rejection_reason` is **required** when rejecting.
* Rejecting returns the rider to `approved_for_documents` (and offline), so they replace **only** that document; approved documents stay approved and locked.

### 3.5 Stage 4: Review Vehicle Information
* **`POST /api/v1/admin/riders/{id}/vehicle-review`** — same body and rules as 3.4.

### 3.6 Stage 5: Final Activation
* **`POST /api/v1/admin/riders/{id}/final-activation`**
* Allowed only from `under_review` (or `expired_documents`) **and** when every `activation_checks` item passes; otherwise `422` with `errors.activation: ["Not met: …"]`.
* Sets `approval_status = 'approved'` (fully verified).

---

## 4. Stage 3 — Guided Document Collection (Rider APIs)

Uploads, vehicle changes and submission are accepted only while `approval_status = 'approved_for_documents'`; otherwise `422` with `errors.status` explaining why. Progress is saved per item, so a rider can stop and continue later.

### 4.1 Get Document Checklist & Status
* **`GET /api/v1/rider/documents`**
  ```json
  {
    "data": {
      "approval_status": "approved_for_documents",
      "rejection_reason": null,
      "can_edit": true,
      "submit_blockers": ["Driving License was rejected — please upload a new copy.", "Vehicle Registration (Istimara) is missing."],
      "vehicle_info": {
        "vehicle_type": "car", "vehicle_plate": "ABC-1234", "vehicle_model": "Toyota Yaris 2023",
        "status": "submitted", "rejection_reason": null, "is_submitted": true
      },
      "checklist": [
        { "id": 101, "document_type": "iqama", "title": "National ID / Iqama", "is_mandatory": true, "number_required": true,
          "status": "approved", "document_number": "2498765432", "expiry_date": "2027-05-15",
          "file_url": "https://api.ahaar.store/storage/rider-documents/7/a.jpg", "file_is_pdf": false,
          "rejection_reason": null, "is_expired": false, "uploaded_at": "2026-11-20T13:00:00+01:00" },
        { "id": 102, "document_type": "driving_license", "title": "Driving License", "number_required": true,
          "status": "rejected", "rejection_reason": "Image is blurry. Please upload clear front side." },
        { "id": null, "document_type": "vehicle_registration", "title": "Vehicle Registration (Istimara)",
          "number_required": false, "status": "not_submitted" }
      ],
      "can_go_online": false
    }
  }
  ```
* Vehicle `status`: `not_submitted` | `submitted` | `under_review` | `approved` | `rejected`.

### 4.2 Upload / Replace a Single Document
* **`POST /api/v1/rider/documents`** — `multipart/form-data`
  - `document_type`: `iqama` | `driving_license` | `vehicle_registration`
  - `document_number`: required for `iqama` and `driving_license`
  - `expiry_date`: **required**, `YYYY-MM-DD`, must be in the future
  - `file`: jpeg / png / webp / heic / pdf, max 10 MB
* An **approved, unexpired** document cannot be replaced (`422` on `document_type`).
* **Response `200 OK`:** the full 4.1 payload.

### 4.3 Save Vehicle Information
* **`POST /api/v1/rider/vehicle`** — `{ "vehicle_type": "car", "vehicle_plate": "ABC-1234", "vehicle_model": "Toyota Yaris 2023" }`
* `car` → plan/subscription deliveries only; `bike` → regular/daily instant orders only.
* Locked once an admin approves it. The plate is stored upper-case.
* **Response `200 OK`:** `{ "driver_profile": {…4.5}, "documents": {…4.1} }`

### 4.4 Submit for Review
* **`POST /api/v1/rider/submit-for-review`**
* Refused (`422`, `errors.documents` = the `submit_blockers` list) while any document is missing, rejected or expired, or the vehicle is missing / rejected.
* **Response `200 OK`:** `{ "driver_profile": {…4.5} }` with `approval_status = 'under_review'`.

### 4.5 Rider Profile Block
`register`, `login` and `GET /api/v1/rider/me` all return the same `driver_profile`:
```json
{
  "id": 7, "branch_id": 1, "branch_name": "Central Hub",
  "vehicle_type": "car", "vehicle_plate": "ABC-1234", "vehicle_model": null, "vehicle_status": "submitted",
  "approval_status": "approved_for_documents", "rejection_reason": null,
  "registration_approved": true,
  "fully_verified": false,
  "initial_approved_at": "2026-11-20T12:30:00+01:00", "submitted_for_review_at": null,
  "action_required": true,
  "is_active": false, "is_busy": false, "can_go_online": false
}
```
* `registration_approved` = Stage 2 passed. `fully_verified` = Stage 5 passed. They are **not** the same.
* `action_required` = an admin rejected a document or the vehicle and the rider must fix it.

---

## 5. Shift & Operational APIs

### 5.1 Online/Offline Shift Toggle
* **`POST /api/v1/rider/status`**
* **Request:**
  ```json
  { "is_active": true }
  ```
* **Strict Guard:** Rejects with `422 Unprocessable Entity` if `approval_status !== 'approved'` or any mandatory document has expired.

### 5.2 Rider Location Beacon
* **`POST /api/v1/rider/location`**
* **Request:**
  ```json
  {
    "lat": 24.7136,
    "lng": 46.6753,
    "heading": 182.5,
    "speed": 34.2
  }
  ```

---

## 6. Car Route (Catering) & Bike (Instant) APIs

### 6.1 Get Assigned Car Route Manifest
* **`GET /api/v1/rider/runs/today`**
* **Response `200 OK`:** Returns sequenced route stops with addresses, meal items, and verification codes.

### 6.2 Kitchen Bulk Pickup Handover
* **`POST /api/v1/rider/runs/{id}/accept-handover`**
* **Request:**
  ```json
  { "scanned_verification_codes": ["AH-482-L1", "AH-483-L1"] }
  ```

### 6.3 Doorstep Bag QR Verification
* **`POST /api/v1/rider/deliveries/{id}/verify-package`**
* **Request:**
  ```json
  { "scanned_code": "AH-482-L1" }
  ```

### 6.4 Complete Delivery (Proof-of-Delivery)
* **`POST /api/v1/rider/deliveries/{id}/complete`**
* **Request:** `pod_type`, `photo`, `customer_signature`, `lat`, `lng`.

### 6.5 Report Delivery Exception
* **`POST /api/v1/rider/deliveries/{id}/report-issue`**
* **Request:** `reason`, `photo`, `notes`.

### 6.6 Bike Instant Orders
* `GET  /api/v1/rider/orders/available`
* `POST /api/v1/rider/orders/{id}/claim` (Pessimistic lock)
* `POST /api/v1/rider/orders/{id}/pickup`
* `POST /api/v1/rider/orders/{id}/complete` (PoD + COD)
