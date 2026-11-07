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

## 3. Stage 2 & 4 — Admin Review & Approval Endpoints

### 3.1 Stage 2: Initial Admin Approval
* **`POST /api/v1/admin/riders/{id}/initial-approval`**
* **Headers:** `Authorization: Bearer {admin_token}`
* **Request:**
  ```json
  {
    "action": "approve", // "approve" | "reject" | "suspend"
    "rejection_reason": null // Required if action == "reject"
  }
  ```
* **Response `200 OK`:** Sets `approval_status = 'approved_for_documents'`, unlocking Stage 3 in the Rider App.

### 3.2 Stage 4: Admin Individual Document Verification
* **`PATCH /api/v1/admin/riders/{riderId}/documents/{docId}`**
* **Request:**
  ```json
  {
    "status": "approved", // "approved" | "rejected"
    "rejection_reason": null // Required if status == "rejected"
  }
  ```
* **Response `200 OK`:** Updates document status and records Admin reviewer ID.

### 3.3 Stage 5: Final Rider Activation
* **`POST /api/v1/admin/riders/{id}/final-activation`**
* **Business Rule:** Verifies all mandatory documents are approved and unexpired, and vehicle details exist. Sets `approval_status = 'approved'`.

---

## 4. Stage 3 — Guided Document Collection (Rider APIs)

### 4.1 Get Document Checklist & Status
* **`GET /api/v1/rider/documents`**
* **Response `200 OK`:**
  ```json
  {
    "data": {
      "approval_status": "approved_for_documents",
      "rejection_reason": null,
      "vehicle_info": {
        "vehicle_type": "car",
        "vehicle_plate": "ABC-1234",
        "is_submitted": true
      },
      "documents": [
        {
          "id": 101,
          "document_type": "iqama",
          "document_number": "2498765432",
          "expiry_date": "2027-05-15",
          "status": "approved",
          "rejection_reason": null,
          "file_url": "https://api.ahaar.store/storage/documents/iqama_42.jpg"
        },
        {
          "id": 102,
          "document_type": "driving_license",
          "document_number": "LIC-88271",
          "expiry_date": "2026-12-31",
          "status": "rejected",
          "rejection_reason": "Image is blurry. Please upload clear front side.",
          "file_url": "https://api.ahaar.store/storage/documents/dl_42.jpg"
        },
        {
          "id": null,
          "document_type": "vehicle_registration",
          "document_number": null,
          "expiry_date": null,
          "status": "not_submitted",
          "rejection_reason": null,
          "file_url": null
        }
      ]
    }
  }
  ```

### 4.2 Upload Single Document (Step-by-Step)
* **`POST /api/v1/rider/documents`**
* **Headers:** `Content-Type: multipart/form-data`
* **Request Body:**
  - `document_type`: `iqama` | `driving_license` | `vehicle_registration`
  - `document_number`: "2498765432"
  - `expiry_date`: "2027-05-15" (YYYY-MM-DD)
  - `file`: (Binary image/pdf, max 10MB)
* **Response `200 OK`:** Updates/creates `DriverDocument` with `status = 'submitted'`.

### 4.3 Save Vehicle Information
* **`POST /api/v1/rider/vehicle`**
* **Request:**
  ```json
  {
    "vehicle_type": "car", // "car" | "bike"
    "vehicle_plate": "ABC-1234",
    "vehicle_model": "Toyota Yaris 2023"
  }
  ```
* **Response `200 OK`:** Saves vehicle info to `DriverProfile`.

### 4.4 Submit Documents for Review
* **`POST /api/v1/rider/submit-for-review`**
* **Response `200 OK`:** Sets `approval_status = 'under_review'`.

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
