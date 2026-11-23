import * as Location from 'expo-location';
import { Linking } from 'react-native';

import type { BadgeVariant } from '@/components/ui';
import { errorReason, extractErrorMessage } from '@/lib/api/client';
import type { ActiveJob, CarRunStop, DeliveryStatus, DispatchReason, Job, PodType, RunStatus, WrongRunHint } from '@/lib/api/types';

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  searching_rider: 'New order',
  assigned: 'Assigned to you',
  accepted: 'Accepted',
  heading_to_pickup: 'Heading to kitchen',
  picked_up: 'Picked up',
  on_the_way: 'On the way',
  delivered: 'Delivered',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const DELIVERY_STATUS_VARIANT: Record<DeliveryStatus, BadgeVariant> = {
  searching_rider: 'brand',
  assigned: 'brand',
  accepted: 'info',
  heading_to_pickup: 'info',
  picked_up: 'warning',
  on_the_way: 'warning',
  delivered: 'success',
  failed: 'danger',
  cancelled: 'muted',
};

export const STOP_STATUS_LABEL: Record<CarRunStop['status'], string> = {
  scheduled: 'Scheduled',
  locked: 'Locked',
  packed: 'Packed',
  out_for_delivery: 'On board',
  delivered: 'Delivered',
  failed_attempt: 'Failed',
  paused: 'Paused',
  skipped: 'Skipped',
  returned: 'Returned',
};

export const POD_OPTIONS: { id: PodType; label: string; icon: string }[] = [
  { id: 'handed_to_customer', label: 'Handed to customer', icon: '🤝' },
  { id: 'doorstep', label: 'Left at door', icon: '🚪' },
  { id: 'reception', label: 'Reception', icon: '🏢' },
  { id: 'security_gate', label: 'Security gate', icon: '🛡️' },
];

/** Friendly copy for dispatch `reason`s; falls back to the server message. */
export const REASON_MESSAGE: Partial<Record<DispatchReason, string>> = {
  already_taken: 'Another rider took this order.',
  busy: 'Finish your current delivery first.',
  offline: 'Go online to take orders.',
  invalid_token: "That isn't an Ahaar box label.",
  token_expired: 'This box label has expired. Ask the kitchen to reprint it.',
  token_revoked: 'This box label is no longer valid (delivered, reprinted or taken off the route).',
  wrong_run: 'This box belongs to another route. Leave it at the kitchen.',
  wrong_package: 'This box is for another stop.',
  load_incomplete: 'Some boxes are not in the car yet. Scan them, or ask dispatch to allow the start.',
  run_not_ready: "The kitchen hasn't marked this route ready yet. Labels come with it.",
  app_update_required: 'Please update AHAAR Rider to continue.',
  invalid_transition: 'This order has moved on. Showing its latest status.',
  not_yours: 'This order is no longer assigned to you.',
  not_dispatchable: 'This order is no longer waiting for a rider.',
};

/** What to tell the rider about a failed delivery action. */
export function actionErrorMessage(error: unknown): string {
  const reason = errorReason(error);
  return (reason && REASON_MESSAGE[reason]) || extractErrorMessage(error);
}

export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  draft: 'Being planned',
  ready: 'Ready to load',
  loading: 'Loading',
  dispatched: 'On the road',
  completed: 'Completed',
};

/** Label alphabet: no 0/O, 1/I/L or U look-alikes (docs/delivery-api.md, "Box labels"). */
const BOX_TOKEN = /^(?:AHR-?)?([23456789ABCDEFGHJKMNPQRSTVWXYZ]{6})$/;

/**
 * The QR on a box sticker is the token text only (`AHR-9X4K2M`). Accepts it
 * with or without the prefix, any case, and spaces from typing.
 * Returns the canonical `AHR-XXXXXX`, or null for anything else.
 */
export function normalizeBoxToken(raw: string): string | null {
  const text = raw.trim().toUpperCase().replace(/\s+/g, '');
  const m = BOX_TOKEN.exec(text);
  return m ? `AHR-${m[1]}` : null;
}

/** "Lunch route CR-…, Olaya" for a `wrong_run` box: where it belongs, never whose it is. */
export function wrongRunText(hint: WrongRunHint | null | undefined): string {
  const where = [hint?.slot_name, hint?.run_code, hint?.branch_name].filter(Boolean).join(' · ');
  return where ? `This box belongs to another route (${where}). Leave it at the kitchen.` : REASON_MESSAGE.wrong_run!;
}

const BIKE_TRACKING: DeliveryStatus[] = ['accepted', 'heading_to_pickup', 'picked_up', 'on_the_way'];

export function isStopFinal(status: CarRunStop['status']): boolean {
  return status === 'delivered' || status === 'failed_attempt' || status === 'returned' || status === 'skipped';
}

/** The rider's position should be streamed: bike accepted…on_the_way, or a car run on the road. */
export function needsTracking(job: ActiveJob | undefined): boolean {
  if (!job) return false;
  if (job.kind === 'order') return BIKE_TRACKING.includes(job.delivery_status);
  return job.status === 'dispatched';
}

/** Where the bike rider is heading now: the kitchen before pickup, the customer after. */
export function jobTarget(job: Job): { lat: number; lng: number; label: string } | null {
  const toKitchen = ['assigned', 'searching_rider', 'accepted', 'heading_to_pickup'].includes(job.delivery_status);
  if (toKitchen) {
    const b = job.branch;
    return b?.lat != null && b?.lng != null ? { lat: Number(b.lat), lng: Number(b.lng), label: b.name } : null;
  }
  const a = job.address;
  return a.lat != null && a.lng != null
    ? { lat: Number(a.lat), lng: Number(a.lng), label: a.line1 ?? 'Customer' }
    : null;
}

/** Google Maps turn-by-turn directions (the app when installed, else the browser). */
export function openDirections(target: { lat?: number | null; lng?: number | null; query?: string | null }) {
  const destination =
    target.lat != null && target.lng != null
      ? `${target.lat},${target.lng}`
      : encodeURIComponent(target.query ?? '');
  if (!destination) return;
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`);
}

export function callPhone(phone?: string | null) {
  if (phone) Linking.openURL(`tel:${phone}`);
}

export function smsPhone(phone?: string | null) {
  if (phone) Linking.openURL(`sms:${phone}`);
}

/** Last known (or a quick fresh) position for step payloads; never blocks a step. */
export async function currentCoords(): Promise<{ lat?: number; lng?: number }> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return {};
    const loc =
      (await Location.getLastKnownPositionAsync({ maxAge: 60_000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return loc ? { lat: loc.coords.latitude, lng: loc.coords.longitude } : {};
  } catch {
    return {};
  }
}

/** A picked image as a multipart file part. */
export function photoPart(uri: string) {
  const name = uri.split('/').pop() || 'photo.jpg';
  const ext = /\.(\w+)$/.exec(name)?.[1]?.toLowerCase() ?? 'jpg';
  const type = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  return { uri, name, type } as unknown as Blob;
}

export function appendCoords(form: FormData, coords: { lat?: number; lng?: number }) {
  if (coords.lat != null && coords.lng != null) {
    form.append('lat', String(coords.lat));
    form.append('lng', String(coords.lng));
  }
}

export function formatTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Camera first (proof of delivery); the library when the camera isn't allowed. */
export async function takePhoto(): Promise<string | null> {
  const ImagePicker = await import('expo-image-picker');
  const cam = await ImagePicker.requestCameraPermissionsAsync();
  const result = cam.granted
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
  return !result.canceled && result.assets[0]?.uri ? result.assets[0].uri : null;
}
