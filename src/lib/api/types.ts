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

export interface DeliveryAddress {
  line1: string;
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

export interface CarRunStop {
  delivery_id: number;
  stop_sequence: number;
  verification_code: string;
  status: 'scheduled' | 'locked' | 'packed' | 'out_for_delivery' | 'delivered' | 'failed_attempt';
  customer_name: string;
  customer_phone?: string;
  address: DeliveryAddress;
  items: MealItem[];
  pod?: {
    pod_type?: string;
    pod_photo_url?: string;
    delivered_at?: string;
  };
  failed_reason?: string;
}

export interface CarRun {
  run_id: number;
  run_code: string;
  slot_name: string;
  slot_window: string;
  status: 'draft' | 'ready' | 'dispatched' | 'completed' | 'cancelled';
  total_stops: number;
  completed_stops: number;
  stops: CarRunStop[];
}

export interface BikeOrder {
  order_id: number;
  total_amount: number;
  currency: string;
  status?: string;
  driver_id?: number | null;
  customer_name?: string;
  customer_phone?: string;
  address?: Record<string, any>;
  branch_name?: string;
  items_count: number;
  items?: Array<{ name: string; quantity: number; price: number }>;
  confirmed_at?: string;
  dispatched_at?: string;
}
