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

export interface DriverProfileState {
  id: number;
  branch_id?: number | null;
  branch_name?: string | null;
  vehicle_type?: 'car' | 'bike' | null;
  vehicle_plate?: string | null;
  vehicle_model?: string | null;
  approval_status: ApprovalStatus;
  rejection_reason?: string | null;
  is_active: boolean;
  is_busy: boolean;
  can_go_online?: boolean;
}

export interface DriverDocumentItem {
  id: number;
  type: string;
  document_number?: string;
  file_url: string;
  expires_at?: string;
  status: 'submitted' | 'approved' | 'rejected' | 'expired';
  rejection_reason?: string | null;
}

export interface DocumentsResponse {
  driver_profile: DriverProfileState;
  documents: DriverDocumentItem[];
  missing_types: string[];
  all_approved: boolean;
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
