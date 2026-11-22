export interface RiderUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  roles: string[];
}

export type ApprovalStatus =
  | 'pending_initial_approval'
  | 'approved_for_documents'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'expired_documents';

export type VehicleType = 'car' | 'bike';

export interface DriverProfileState {
  id: number;
  branch_id?: number | null;
  branch_name?: string | null;
  vehicle_type?: VehicleType | null;
  vehicle_plate?: string | null;
  vehicle_model?: string | null;
  vehicle_status?: 'not_submitted' | 'submitted' | 'approved' | 'rejected';
  approval_status: ApprovalStatus;
  rejection_reason?: string | null;
  /** Stage 2 passed (may collect documents) — NOT the same as fully_verified. */
  registration_approved?: boolean;
  /** Stage 5 passed (activated by admin). */
  fully_verified?: boolean;
  initial_approved_at?: string | null;
  submitted_for_review_at?: string | null;
  /** An admin rejected a document or the vehicle; the rider must replace it. */
  action_required?: boolean;
  is_active: boolean;
  is_busy: boolean;
  can_go_online?: boolean;
}

export type DocumentType = 'iqama' | 'driving_license' | 'vehicle_registration';

export type ItemStatus =
  | 'not_submitted'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'expired';

export interface ChecklistItem {
  id: number | null;
  document_type: DocumentType;
  title: string;
  is_mandatory: boolean;
  number_required: boolean;
  status: ItemStatus;
  document_number: string | null;
  expiry_date: string | null;
  file_url: string | null;
  file_is_pdf: boolean;
  rejection_reason: string | null;
  is_expired: boolean;
  uploaded_at: string | null;
}

export interface VehicleInfo {
  vehicle_type: VehicleType | null;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  status: Exclude<ItemStatus, 'expired'>;
  rejection_reason: string | null;
  is_submitted: boolean;
}

/** GET /rider/documents (also returned by POST /rider/documents). */
export interface DocumentsResponse {
  approval_status: ApprovalStatus;
  rejection_reason: string | null;
  can_edit: boolean;
  submit_blockers: string[];
  vehicle_info: VehicleInfo;
  checklist: ChecklistItem[];
  can_go_online: boolean;
}

// ---------------------------------------------------------------------------
// Delivery contract (ahaar-backend docs/delivery-api.md)
// ---------------------------------------------------------------------------

/** Stable error `reason`s from dispatch actions: `{ message, reason, errors }`. */
export type DispatchReason =
  | 'already_taken'
  | 'busy'
  | 'invalid_transition'
  | 'not_dispatchable'
  | 'not_yours'
  | 'not_eligible'
  | 'wrong_vehicle'
  | 'offline'
  | 'wrong_code'
  | 'rider_unavailable'
  | 'already_dispatched';

/** GET /rider/branches (public, registration form). */
export interface PublicBranch {
  id: number;
  name: string;
  code: string | null;
  address: string | null;
}

export interface JobBranch {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
}

export interface Slot {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
}

export type DeliveryStatus =
  | 'searching_rider'
  | 'assigned'
  | 'accepted'
  | 'heading_to_pickup'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type JobAction =
  | 'accept'
  | 'decline'
  | 'heading_to_pickup'
  | 'pickup'
  | 'on_the_way'
  | 'complete'
  | 'report_issue';

export type PodType = 'handed_to_customer' | 'doorstep' | 'reception' | 'security_gate';

/** An instant order open to this rider (no customer identity). */
export interface Offer {
  order_id: number;
  delivery_status: DeliveryStatus;
  assigned_to_you: boolean;
  branch: JobBranch | null;
  /** lat/lng rounded to ~1 km. */
  drop: { area: string | null; city: string | null; lat: number | null; lng: number | null };
  distance_km: number | null;
  items_count: number;
  total_amount: number;
  currency: string;
  /** COD amount to collect at the door. */
  cash_to_collect: number | null;
  slot: Slot | null;
  delivery_date: string | null;
  offered_at: string | null;
}

/** An instant order this rider holds. */
export interface Job extends Offer {
  kind: 'order';
  /** orders.status: the money/lifecycle field, not the delivery step. */
  status: string;
  customer: { name: string | null; phone: string | null };
  address: {
    line1: string | null;
    line2: string | null;
    area: string | null;
    city: string | null;
    building_number: string | null;
    short_address: string | null;
    instructions: string | null;
    lat: number | null;
    lng: number | null;
  };
  items: { name: string; quantity: number; unit_price: number }[];
  next_actions: JobAction[];
  pod: {
    pod_type: PodType | null;
    pod_photo_url: string | null;
    cash_collected: number | null;
    delivered_at: string | null;
  };
  timeline: { status: string; at: string | null }[];
  accepted_at: string | null;
  picked_up_at: string | null;
  failed_reason: string | null;
}

export interface DeliveryAddress {
  line1: string | null;
  line2?: string | null;
  area?: string | null;
  city?: string | null;
  instructions?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface MealItem {
  id: number;
  name: string;
  quantity: number;
  was_swapped?: boolean;
  swapped_from?: string | null;
}

export type StopStatus =
  | 'scheduled'
  | 'locked'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_attempt'
  | 'paused'
  | 'skipped'
  | 'returned';

export interface CarRunStop {
  delivery_id: number;
  stop_sequence: number;
  verification_code: string;
  status: StopStatus;
  customer_name: string | null;
  customer_phone?: string | null;
  address: DeliveryAddress;
  items: MealItem[];
  pod?: {
    pod_type?: string | null;
    pod_photo_url?: string | null;
    delivered_at?: string | null;
  };
  failed_reason?: string | null;
  run_code?: string | null;
  slot_name?: string | null;
}

export interface CarRun {
  kind: 'run';
  run_id: number;
  run_code: string;
  slot_name: string | null;
  slot_window: string | null;
  delivery_date: string | null;
  status: 'ready' | 'dispatched' | 'completed';
  branch: JobBranch | null;
  total_stops: number;
  completed_stops: number;
  started_at: string | null;
  stops: CarRunStop[];
}

/** GET /rider/jobs/active: a bike Job, a car Run, or nothing. */
export type ActiveJob = Job | CarRun | null;

export interface RiderStats {
  vehicle_type: VehicleType | null;
  today: { completed: number; failed: number; cash_collected: number };
  week: { completed: number; cash_collected: number };
  total_completed: number;
  runs_completed?: number;
  currency: string;
  recent: {
    kind: 'order' | 'delivery';
    id: number;
    status: string;
    area: string | null;
    branch: string | null;
    cash_collected: number | null;
    currency: string | null;
    at: string | null;
  }[];
}

export interface LocationPoint {
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  recorded_at?: string;
}
