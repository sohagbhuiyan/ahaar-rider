import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { DeliveryMap, mapsAvailable, type MapPin } from '@/components/delivery/DeliveryMap';
import { JobStepper } from '@/components/delivery/JobStepper';
import { OfferSummary } from '@/components/delivery/OfferSummary';
import { RequireSession } from '@/components/session/RequireSession';
import { Badge, Button, Card, ErrorState, Input, LoadingSpinner, Sheet } from '@/components/ui';
import { errorReason } from '@/lib/api/client';
import { useAcceptOffer, useDeclineOffer, useJobStep, useOrder } from '@/lib/api/hooks/useRiderDeliveries';
import { isJob } from '@/lib/api/services/riderDeliveryService';
import type { Job, Offer, PodType } from '@/lib/api/types';
import {
  actionErrorMessage,
  appendCoords,
  callPhone,
  currentCoords,
  DELIVERY_STATUS_LABEL,
  DELIVERY_STATUS_VARIANT,
  formatTime,
  jobTarget,
  openDirections,
  photoPart,
  POD_OPTIONS,
  smsPhone,
  takePhoto,
} from '@/lib/delivery';
import { colors } from '@/lib/theme';
import { cn, formatMoney } from '@/lib/utils';

const FINAL = ['delivered', 'failed', 'cancelled'];

export default function OrderScreen() {
  return (
    <RequireSession>
      <OrderScreenContent />
    </RequireSession>
  );
}

function OrderScreenContent() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);

  const { data, error, isLoading, refetch, isRefetching } = useOrder(orderId || null, { poll: true });
  const reason = errorReason(error);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  let body: React.ReactNode;
  if (isLoading) {
    body = <LoadingSpinner label="Loading order…" className="flex-1" />;
  } else if (reason === 'already_taken' || reason === 'not_yours') {
    body = (
      <GoneState
        title={reason === 'already_taken' ? 'Taken by another rider' : 'No longer assigned to you'}
        message={
          reason === 'already_taken'
            ? 'Another rider accepted this order first, or it was cancelled.'
            : 'Dispatch moved this order to another rider.'
        }
        onDone={() => router.replace('/(tabs)/orders')}
      />
    );
  } else if (error || !data) {
    body = <ErrorState message={actionErrorMessage(error)} onRetry={() => refetch()} className="flex-1" />;
  } else if (isJob(data)) {
    body = <JobView job={data} refreshing={isRefetching} onRefresh={refetch} />;
  } else {
    body = <OfferView offer={data} onGone={() => router.replace('/(tabs)/orders')} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-muted" edges={['top']}>
      <View className="px-5 pt-2 pb-3 bg-surface border-b border-border flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="h-9 w-9 items-center justify-center rounded-full bg-surface-muted border border-border"
        >
          <Text className="text-base font-bold text-text-primary">←</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-brand-700">Instant order</Text>
          <Text className="text-lg font-black text-text-primary">Order #{orderId}</Text>
        </View>
        {data ? (
          <Badge
            label={DELIVERY_STATUS_LABEL[data.delivery_status] ?? data.delivery_status}
            variant={DELIVERY_STATUS_VARIANT[data.delivery_status] ?? 'muted'}
          />
        ) : null}
      </View>
      {body}
    </SafeAreaView>
  );
}

function GoneState({ title, message, onDone }: { title: string; message: string; onDone: () => void }) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-surface border border-border">
        <Text className="text-2xl">🏁</Text>
      </View>
      <Text className="text-center text-lg font-bold text-text-primary">{title}</Text>
      <Text className="mt-1 text-center text-sm text-text-secondary">{message}</Text>
      <Button label="Back to orders" variant="outline" size="md" fullWidth={false} className="mt-5 px-6" onPress={onDone} />
    </View>
  );
}

// ===========================================================================
// OFFER: accept or decline
// ===========================================================================

function OfferView({ offer, onGone }: { offer: Offer; onGone: () => void }) {
  const accept = useAcceptOffer();
  const decline = useDeclineOffer();
  const [taken, setTaken] = useState(false);

  if (taken) {
    return (
      <GoneState
        title="Taken by another rider"
        message="Someone accepted this order a moment before you. New orders will keep coming."
        onDone={onGone}
      />
    );
  }

  const onAccept = () =>
    accept.mutate(offer.order_id, {
      // The cached order becomes a Job and this screen re-renders as the job.
      onSuccess: () => toast.success('Order accepted. Head to the kitchen.'),
      onError: (err) => {
        const r = errorReason(err);
        if (r === 'already_taken' || r === 'not_dispatchable') setTaken(true);
        else toast.error(actionErrorMessage(err));
      },
    });

  const onDecline = () =>
    decline.mutate(
      { orderId: offer.order_id },
      {
        onSuccess: () => {
          toast.info('Order declined.');
          onGone();
        },
        onError: (err) => toast.error(actionErrorMessage(err)),
      },
    );

  const pins: MapPin[] = [];
  if (offer.branch?.lat != null && offer.branch?.lng != null) {
    pins.push({ id: 'kitchen', lat: Number(offer.branch.lat), lng: Number(offer.branch.lng), title: offer.branch.name, label: 'K', tone: 'brand' });
  }
  if (offer.drop.lat != null && offer.drop.lng != null) {
    pins.push({ id: 'drop', lat: Number(offer.drop.lat), lng: Number(offer.drop.lng), title: offer.drop.area ?? 'Drop-off area', label: 'C', tone: 'info' });
  }

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        {offer.assigned_to_you ? (
          <Card className="bg-info-soft border-info/20">
            <Text className="text-sm font-bold text-info">Dispatch assigned this order to you</Text>
            <Text className="text-xs text-text-secondary mt-0.5">Accept to start, or decline so it goes to another rider.</Text>
          </Card>
        ) : null}
        <DeliveryMap pins={pins} />
        <Card>
          <OfferSummary offer={offer} />
        </Card>
        <Text className="text-xs text-center text-text-muted">
          The customer&apos;s name and exact address appear once you accept.
        </Text>
      </ScrollView>
      <View className="flex-row gap-3 border-t border-border bg-surface px-5 pt-3 pb-6">
        <Button
          label="Decline"
          variant="outline"
          size="lg"
          fullWidth={false}
          className="flex-1"
          isLoading={decline.isPending}
          disabled={accept.isPending}
          onPress={onDecline}
        />
        <Button
          label="Accept order"
          size="lg"
          fullWidth={false}
          className="flex-[2]"
          isLoading={accept.isPending}
          disabled={decline.isPending}
          onPress={onAccept}
        />
      </View>
    </>
  );
}

// ===========================================================================
// JOB: kitchen → customer
// ===========================================================================

function JobView({ job, refreshing, onRefresh }: { job: Job; refreshing: boolean; onRefresh: () => void }) {
  const router = useRouter();
  const step = useJobStep(job.order_id);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  const actions = new Set(job.next_actions);
  const isFinal = FINAL.includes(job.delivery_status);
  const beforePickup = ['accepted', 'heading_to_pickup'].includes(job.delivery_status);
  const target = jobTarget(job);
  const cash = job.cash_to_collect != null && job.cash_to_collect > 0 ? job.cash_to_collect : null;
  const pending = step.isPending ? step.variables?.action : null;

  const pins: MapPin[] = [];
  if (job.branch?.lat != null && job.branch?.lng != null) {
    pins.push({ id: 'kitchen', lat: Number(job.branch.lat), lng: Number(job.branch.lng), title: job.branch.name, label: 'K', tone: beforePickup ? 'brand' : 'muted', highlighted: beforePickup });
  }
  if (job.address.lat != null && job.address.lng != null) {
    pins.push({ id: 'customer', lat: Number(job.address.lat), lng: Number(job.address.lng), title: job.customer.name ?? 'Customer', description: job.address.line1 ?? undefined, label: 'C', tone: beforePickup ? 'muted' : 'info', highlighted: !beforePickup });
  }

  const advance = async (action: 'heading_to_pickup' | 'on_the_way') => {
    const coords = await currentCoords();
    step.mutate(
      { action, coords },
      {
        onSuccess: () => toast.success(action === 'on_the_way' ? 'On the way to the customer.' : 'Heading to the kitchen.'),
        onError: (err) => toast.error(actionErrorMessage(err)),
      },
    );
  };

  const confirmPickup = async () => {
    if (!/^\d{4}$/.test(code)) {
      setCodeError('Enter the 4-digit code printed on the bag.');
      return;
    }
    setCodeError(null);
    const coords = await currentCoords();
    step.mutate(
      { action: 'pickup', code, coords },
      {
        onSuccess: () => {
          setCode('');
          toast.success('Pickup confirmed.');
        },
        onError: (err) => {
          if (errorReason(err) === 'wrong_code') setCodeError(actionErrorMessage(err));
          else toast.error(actionErrorMessage(err));
        },
      },
    );
  };

  return (
    <>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />}
      >
        <Card>
          <JobStepper status={job.delivery_status} />
        </Card>

        {isFinal ? <FinalCard job={job} onDone={() => router.replace('/(tabs)')} /> : null}

        {!isFinal ? <DeliveryMap pins={pins} /> : null}

        {/* Current target */}
        {!isFinal ? (
          beforePickup ? (
            <Card className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">Pick up from</Text>
                <Badge label="KITCHEN" variant="brand" />
              </View>
              <View>
                <Text className="text-lg font-black text-text-primary">{job.branch?.name ?? 'Kitchen'}</Text>
                {job.branch?.address ? <Text className="text-sm text-text-secondary mt-0.5">{job.branch.address}</Text> : null}
              </View>
              <View className="flex-row gap-2">
                <Button
                  label="Navigate"
                  size="md"
                  fullWidth={false}
                  className="flex-1"
                  left={<Text>🧭</Text>}
                  onPress={() => openDirections({ lat: target?.lat, lng: target?.lng, query: job.branch?.address })}
                />
                {job.branch?.phone ? (
                  <Button label="Call" variant="outline" size="md" fullWidth={false} className="px-5" onPress={() => callPhone(job.branch?.phone)} />
                ) : null}
              </View>
            </Card>
          ) : (
            <CustomerCard job={job} onNavigate={() => openDirections({ lat: target?.lat, lng: target?.lng, query: job.address.line1 })} />
          )
        ) : null}

        {!mapsAvailable() && !isFinal ? (
          <Text className="text-[11px] text-center text-text-muted">Map preview needs a Google Maps key in this build. Navigate opens Google Maps.</Text>
        ) : null}

        {/* Cash */}
        {cash && !isFinal ? (
          <Card className="flex-row items-center justify-between bg-warning-soft border-warning/30">
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-warning">Collect cash</Text>
              <Text className="text-xs text-text-secondary mt-0.5">Cash on delivery</Text>
            </View>
            <Text className="text-xl font-black text-text-primary">{formatMoney(cash, job.currency)}</Text>
          </Card>
        ) : null}

        {/* Pickup code */}
        {actions.has('pickup') ? (
          <Card className="gap-3 border-brand-200">
            <View>
              <Text className="text-base font-black text-text-primary">Confirm pickup</Text>
              <Text className="text-xs text-text-secondary mt-0.5">Type the 4-digit code on the bag the kitchen hands you.</Text>
            </View>
            <Input
              value={code}
              onChangeText={(v) => {
                setCode(v.replace(/\D/g, '').slice(0, 4));
                setCodeError(null);
              }}
              placeholder="0000"
              keyboardType="number-pad"
              maxLength={4}
              error={codeError ?? undefined}
              className="text-center text-2xl font-black tracking-[12px]"
              accessibilityLabel="Bag code"
            />
            <Button
              label="Confirm pickup"
              size="lg"
              isLoading={pending === 'pickup'}
              disabled={step.isPending || code.length !== 4}
              onPress={confirmPickup}
            />
          </Card>
        ) : null}

        {/* Order items */}
        <Card className="gap-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Items ({job.items_count})
          </Text>
          {job.items.map((item, i) => (
            <View key={`${item.name}-${i}`} className="flex-row items-center justify-between rounded-xl bg-surface-muted border border-border px-3 py-2">
              <Text className="flex-1 text-sm font-semibold text-text-primary" numberOfLines={2}>{item.name}</Text>
              <Text className="text-xs font-black text-brand-700">×{item.quantity}</Text>
            </View>
          ))}
        </Card>

        {beforePickup && !isFinal ? <CustomerCard job={job} compact /> : null}
      </ScrollView>

      {/* Step buttons: only what the server allows next. */}
      {!isFinal && job.next_actions.length > 0 ? (
        <View className="gap-2 border-t border-border bg-surface px-5 pt-3 pb-6">
          {actions.has('heading_to_pickup') ? (
            <Button
              label="I'm heading to the kitchen"
              variant="secondary"
              size="md"
              isLoading={pending === 'heading_to_pickup'}
              disabled={step.isPending}
              onPress={() => advance('heading_to_pickup')}
            />
          ) : null}
          {actions.has('on_the_way') ? (
            <Button
              label="Start trip to customer"
              size="lg"
              isLoading={pending === 'on_the_way'}
              disabled={step.isPending}
              onPress={() => advance('on_the_way')}
            />
          ) : null}
          {actions.has('complete') ? (
            <Button
              label="Mark as delivered"
              variant={actions.has('on_the_way') ? 'secondary' : 'primary'}
              size={actions.has('on_the_way') ? 'md' : 'lg'}
              disabled={step.isPending}
              onPress={() => setCompleteOpen(true)}
            />
          ) : null}
          {actions.has('report_issue') ? (
            <Button label="Report a problem" variant="ghost" size="sm" disabled={step.isPending} textClassName="text-danger" onPress={() => setIssueOpen(true)} />
          ) : null}
        </View>
      ) : null}

      <CompleteSheet job={job} open={completeOpen} onClose={() => setCompleteOpen(false)} step={step} />
      <IssueSheet open={issueOpen} onClose={() => setIssueOpen(false)} step={step} />
    </>
  );
}

function CustomerCard({ job, compact = false, onNavigate }: { job: Job; compact?: boolean; onNavigate?: () => void }) {
  const a = job.address;
  const detail = [a.building_number && `Building ${a.building_number}`, a.line2, a.area, a.city].filter(Boolean).join(' · ');
  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">{compact ? 'Then deliver to' : 'Deliver to'}</Text>
        <Badge label="CUSTOMER" variant="info" />
      </View>
      <View>
        <Text className="text-lg font-black text-text-primary">{job.customer.name ?? 'Customer'}</Text>
        <Text className="text-sm font-semibold text-text-primary mt-0.5">{a.line1 ?? job.drop.area ?? '—'}</Text>
        {detail ? <Text className="text-xs text-text-secondary mt-0.5">{detail}</Text> : null}
        {a.short_address ? <Text className="text-xs font-mono text-text-muted mt-0.5">{a.short_address}</Text> : null}
      </View>
      {a.instructions && !compact ? (
        <View className="rounded-xl bg-surface-muted border border-border p-3">
          <Text className="text-xs font-bold text-text-primary">Note from customer</Text>
          <Text className="text-xs text-text-secondary mt-0.5">{a.instructions}</Text>
        </View>
      ) : null}
      {!compact ? (
        <View className="flex-row gap-2">
          {onNavigate ? (
            <Button label="Navigate" size="md" fullWidth={false} className="flex-1" left={<Text>🧭</Text>} onPress={onNavigate} />
          ) : null}
          <Button label="Call" variant="outline" size="md" fullWidth={false} className="px-4" disabled={!job.customer.phone} onPress={() => callPhone(job.customer.phone)} />
          <Button label="SMS" variant="outline" size="md" fullWidth={false} className="px-4" disabled={!job.customer.phone} onPress={() => smsPhone(job.customer.phone)} />
        </View>
      ) : null}
    </Card>
  );
}

function FinalCard({ job, onDone }: { job: Job; onDone: () => void }) {
  const delivered = job.delivery_status === 'delivered';
  const failed = job.delivery_status === 'failed';
  return (
    <Card className={cn('gap-2', delivered ? 'bg-success-soft border-success/30' : failed ? 'bg-danger-soft border-danger/30' : 'bg-surface')}>
      <Text className={cn('text-lg font-black', delivered ? 'text-success' : failed ? 'text-danger' : 'text-text-primary')}>
        {delivered ? 'Delivered' : failed ? 'Delivery failed' : 'Order cancelled'}
      </Text>
      {delivered ? (
        <Text className="text-xs text-text-secondary">
          {formatTime(job.pod.delivered_at) ? `At ${formatTime(job.pod.delivered_at)}` : 'Just now'}
          {job.pod.pod_type ? ` · ${POD_OPTIONS.find((p) => p.id === job.pod.pod_type)?.label ?? job.pod.pod_type}` : ''}
          {job.pod.cash_collected != null ? ` · Cash ${formatMoney(job.pod.cash_collected, job.currency)}` : ''}
        </Text>
      ) : null}
      {failed && job.failed_reason ? <Text className="text-xs text-text-secondary">Reason: {job.failed_reason}</Text> : null}
      {job.pod.pod_photo_url ? (
        <Image source={{ uri: job.pod.pod_photo_url }} style={{ height: 160, borderRadius: 12 }} contentFit="cover" />
      ) : null}
      <Button label="Back to home" variant="outline" size="md" className="mt-2 bg-surface" onPress={onDone} />
    </Card>
  );
}

type StepMutation = ReturnType<typeof useJobStep>;

function PhotoPicker({ uri, onChange }: { uri: string | null; onChange: (uri: string | null) => void }) {
  const pick = async () => {
    try {
      const picked = await takePhoto();
      if (picked) onChange(picked);
    } catch {
      toast.error('Could not open the camera.');
    }
  };
  if (uri) {
    return (
      <View className="overflow-hidden rounded-2xl border border-border">
        <Image source={{ uri }} style={{ height: 160 }} contentFit="cover" />
        <Pressable onPress={() => onChange(null)} className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1">
          <Text className="text-xs font-bold text-white">Remove</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable
      onPress={pick}
      accessibilityRole="button"
      className="h-24 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-muted active:opacity-75"
    >
      <Text className="text-xl">📷</Text>
      <Text className="text-xs font-bold text-text-primary mt-1">Add a photo (optional)</Text>
    </Pressable>
  );
}

function CompleteSheet({ job, open, onClose, step }: { job: Job; open: boolean; onClose: () => void; step: StepMutation }) {
  const cashDue = job.cash_to_collect != null && job.cash_to_collect > 0 ? job.cash_to_collect : null;
  const [pod, setPod] = useState<PodType>('handed_to_customer');
  const [photo, setPhoto] = useState<string | null>(null);
  // Prefilled with the amount due until the rider edits it.
  const [cashInput, setCash] = useState<string | null>(null);
  const cash = cashInput ?? (cashDue != null ? String(cashDue) : '');

  const submit = async () => {
    const form = new FormData();
    form.append('pod_type', pod);
    if (photo) form.append('photo', photoPart(photo));
    if (cashDue != null && cash.trim() !== '') form.append('cash_collected', cash.trim());
    appendCoords(form, await currentCoords());
    step.mutate(
      { action: 'complete', formData: form },
      {
        onSuccess: () => {
          onClose();
          setPhoto(null);
          setCash(null);
          toast.success('Order delivered. Great job!');
        },
        onError: (err) => toast.error(actionErrorMessage(err)),
      },
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Confirm delivery"
      description="How was the order handed over?"
      footer={
        <Button
          label="Confirm delivered"
          size="lg"
          variant="success"
          isLoading={step.isPending && step.variables?.action === 'complete'}
          onPress={submit}
        />
      }
    >
      <View className="gap-4 py-2">
        <View className="flex-row flex-wrap gap-2">
          {POD_OPTIONS.map((o) => (
            <Pressable
              key={o.id}
              onPress={() => setPod(o.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: pod === o.id }}
              className={cn(
                'w-[48%] flex-row items-center gap-2 rounded-xl border px-3 py-3',
                pod === o.id ? 'border-brand-500 bg-brand-50' : 'border-border bg-surface',
              )}
            >
              <Text>{o.icon}</Text>
              <Text className={cn('flex-1 text-xs font-bold', pod === o.id ? 'text-brand-700' : 'text-text-secondary')}>{o.label}</Text>
            </Pressable>
          ))}
        </View>

        {cashDue != null ? (
          <Input
            label={`Cash collected (${job.currency})`}
            value={cash}
            onChangeText={(v) => setCash(v.replace(/[^\d.]/g, ''))}
            keyboardType="decimal-pad"
            hint={`Due: ${formatMoney(cashDue, job.currency)}`}
          />
        ) : null}

        <PhotoPicker uri={photo} onChange={setPhoto} />
      </View>
    </Sheet>
  );
}

const ISSUE_REASONS = [
  'Customer not reachable',
  'Wrong or incomplete address',
  'Customer refused the order',
  'Order damaged or spilled',
  'Kitchen order not ready / missing',
  'Vehicle problem or accident',
];

function IssueSheet({ open, onClose, step }: { open: boolean; onClose: () => void; step: StepMutation }) {
  const [reason, setReason] = useState(ISSUE_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  const submit = () => {
    const form = new FormData();
    const full = notes.trim() ? `${reason}: ${notes.trim()}` : reason;
    form.append('reason', full.slice(0, 255));
    if (photo) form.append('photo', photoPart(photo));
    step.mutate(
      { action: 'report_issue', formData: form },
      {
        onSuccess: () => {
          onClose();
          toast.warning('Problem reported. Dispatch has been told.');
        },
        onError: (err) => toast.error(actionErrorMessage(err)),
      },
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Report a problem"
      description="This ends the delivery and alerts dispatch."
      footer={
        <Button
          label="Report and end delivery"
          size="lg"
          variant="destructive"
          isLoading={step.isPending && step.variables?.action === 'report_issue'}
          onPress={submit}
        />
      }
    >
      <View className="gap-2 py-2">
        {ISSUE_REASONS.map((r) => (
          <Pressable
            key={r}
            onPress={() => setReason(r)}
            accessibilityRole="radio"
            accessibilityState={{ selected: reason === r }}
            className={cn('rounded-xl border p-3', reason === r ? 'border-danger bg-danger-soft' : 'border-border bg-surface')}
          >
            <Text className={cn('text-sm font-bold', reason === r ? 'text-danger' : 'text-text-primary')}>{r}</Text>
          </Pressable>
        ))}
        <Input label="Details (optional)" value={notes} onChangeText={setNotes} multiline maxLength={200} containerClassName="mt-2" />
        <View className="mt-2">
          <PhotoPicker uri={photo} onChange={setPhoto} />
        </View>
      </View>
    </Sheet>
  );
}
