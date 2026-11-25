import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { DeliveryMap, type MapPin } from '@/components/delivery/DeliveryMap';
import { BoxScanner, type ScanFeedback } from '@/components/delivery/BoxScanner';
import { OfferSummary } from '@/components/delivery/OfferSummary';
import { QuickScanButton, scanErrorFeedback } from '@/components/delivery/QuickScan';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingSpinner } from '@/components/ui';
import { errorReason } from '@/lib/api/client';
import {
  useAcceptOffer,
  useActiveJob,
  useCarRunsToday,
  useLoadBox,
  useOffers,
  useStartRun,
} from '@/lib/api/hooks/useRiderDeliveries';
import type { CarRun, Job, Offer } from '@/lib/api/types';
import { useAuthStore } from '@/lib/auth/authStore';
import {
  actionErrorMessage,
  DELIVERY_STATUS_LABEL,
  DELIVERY_STATUS_VARIANT,
  isStopFinal,
  RUN_STATUS_LABEL,
  STOP_STATUS_LABEL,
} from '@/lib/delivery';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function OrdersScreen() {
  const profile = useAuthStore((s) => s.profile);
  const isCar = profile?.vehicle_type === 'car';

  return (
    <SafeAreaView className="flex-1 bg-surface-muted" edges={['top']}>
      <View className="px-5 pt-3 pb-3 bg-surface border-b border-border">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {isCar ? 'Catering manifest' : 'Instant dispatch'}
            </Text>
            <Text className="text-2xl font-black text-text-primary mt-0.5">
              {isCar ? "Today's route" : 'Orders'}
            </Text>
          </View>
          <Badge label={isCar ? 'CAR' : 'BIKE'} variant={isCar ? 'brand' : 'info'} />
        </View>
      </View>
      {isCar ? <CarRunView /> : <BikeOrdersView />}
    </SafeAreaView>
  );
}

// ===========================================================================
// BIKE: active job + open offers
// ===========================================================================

function BikeOrdersView() {
  const router = useRouter();
  const isOnline = useAuthStore((s) => Boolean(s.profile?.is_active));
  const activeJob = useActiveJob();
  const offers = useOffers({ isOnline });
  const accept = useAcceptOffer();
  const job = activeJob.data?.kind === 'order' ? activeJob.data : null;

  const refresh = () => Promise.all([activeJob.refetch(), offers.refetch()]);

  const onAccept = (orderId: number) =>
    accept.mutate(orderId, {
      onSuccess: () => {
        toast.success('Order accepted. Head to the kitchen.');
        router.push(`/order/${orderId}`);
      },
      onError: (err) => {
        const r = errorReason(err);
        toast.error(r === 'already_taken' ? 'Taken by another rider.' : actionErrorMessage(err));
      },
    });

  const list = offers.data ?? [];

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 110, gap: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={activeJob.isRefetching || offers.isRefetching}
          onRefresh={refresh}
          tintColor={colors.brand[500]}
        />
      }
    >
      {job ? <ActiveJobCard job={job} onPress={() => router.push(`/order/${job.order_id}`)} /> : null}

      <View className="flex-row items-center justify-between">
        <Text className="text-base font-extrabold text-text-primary">Open orders</Text>
        {isOnline ? (
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-success" />
            <Text className="text-xs font-semibold text-text-secondary">Live</Text>
          </View>
        ) : (
          <Badge label="OFFLINE" variant="muted" />
        )}
      </View>

      {!isOnline ? (
        <Card className="items-center p-6">
          <Text className="text-3xl mb-2">😴</Text>
          <Text className="text-base font-bold text-text-primary">You&apos;re offline</Text>
          <Text className="text-xs text-text-secondary text-center mt-1">Go online from Home to receive new orders.</Text>
          <Button label="Go to Home" size="sm" fullWidth={false} className="mt-4 px-5" onPress={() => router.push('/(tabs)')} />
        </Card>
      ) : offers.isLoading ? (
        <LoadingSpinner label="Looking for orders…" />
      ) : offers.isError ? (
        <ErrorState message={actionErrorMessage(offers.error)} onRetry={() => offers.refetch()} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            title="No orders right now"
            description="New orders from your kitchen pop up here and as a notification. Keep the app online."
          />
        </Card>
      ) : (
        list.map((offer) => (
          <OfferCard
            key={offer.order_id}
            offer={offer}
            busy={Boolean(job)}
            accepting={accept.isPending && accept.variables === offer.order_id}
            onOpen={() => router.push(`/order/${offer.order_id}`)}
            onAccept={() => onAccept(offer.order_id)}
          />
        ))
      )}
    </ScrollView>
  );
}

function ActiveJobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  return (
    <Card onPress={onPress} className="border-brand-200 bg-brand-50 gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold uppercase tracking-wider text-brand-700">Your active delivery</Text>
        <Badge label={DELIVERY_STATUS_LABEL[job.delivery_status]} variant={DELIVERY_STATUS_VARIANT[job.delivery_status]} />
      </View>
      <Text className="text-lg font-black text-text-primary">Order #{job.order_id}</Text>
      <Text className="text-xs text-text-secondary">
        {job.branch?.name ?? 'Kitchen'} → {job.address.area ?? job.drop.area ?? 'Customer'}
      </Text>
      <Text className="text-xs font-bold text-brand-700 mt-1">Continue →</Text>
    </Card>
  );
}

function OfferCard({
  offer,
  busy,
  accepting,
  onOpen,
  onAccept,
}: {
  offer: Offer;
  busy: boolean;
  accepting: boolean;
  onOpen: () => void;
  onAccept: () => void;
}) {
  return (
    <Card onPress={onOpen} className={cn('gap-3', offer.assigned_to_you && 'border-info/40')}>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold text-brand-700">ORDER #{offer.order_id}</Text>
        {offer.assigned_to_you ? <Badge label="ASSIGNED TO YOU" variant="info" /> : <Badge label="NEW" variant="brand" />}
      </View>
      <OfferSummary offer={offer} compact />
      <View className="flex-row gap-2">
        <Button label="Details" variant="outline" size="sm" fullWidth={false} className="flex-1" onPress={onOpen} />
        <Button
          label={busy ? 'Finish current first' : 'Accept'}
          size="sm"
          fullWidth={false}
          className="flex-1"
          disabled={busy}
          isLoading={accepting}
          onPress={onAccept}
        />
      </View>
    </Card>
  );
}

// ===========================================================================
// CAR: today's route (load every box, then drive stop by stop)
// ===========================================================================

function CarRunView() {
  const router = useRouter();
  const isOnline = useAuthStore((s) => Boolean(s.profile?.is_active));
  const run = useCarRunsToday({ isOnline });
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  if (run.isLoading) return <LoadingSpinner label="Loading your route…" className="flex-1" />;
  if (run.isError) return <ErrorState message={actionErrorMessage(run.error)} onRetry={() => run.refetch()} className="flex-1" />;

  const data = run.data;
  if (!data) {
    return (
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={run.isRefetching} onRefresh={run.refetch} tintColor={colors.brand[500]} />}
      >
        <Card>
          <EmptyState
            title="No route assigned"
            description="When dispatch gives you a subscription route, its stops appear here in driving order."
            actionLabel="Refresh"
            onAction={() => run.refetch()}
          />
        </Card>
      </ScrollView>
    );
  }

  const stops = [...data.stops].sort((a, b) => a.stop_sequence - b.stop_sequence);
  const atKitchen = data.status === 'ready' || data.status === 'loading';
  const next = data.status === 'dispatched' ? stops.find((s) => !isStopFinal(s.status)) : undefined;
  const pending = stops.filter((s) => !isStopFinal(s.status));
  const filtered = stops.filter((s) =>
    filter === 'pending' ? !isStopFinal(s.status) : filter === 'completed' ? isStopFinal(s.status) : true,
  );

  const pins: MapPin[] = [];
  if (data.branch?.lat != null && data.branch?.lng != null) {
    pins.push({ id: 'kitchen', lat: Number(data.branch.lat), lng: Number(data.branch.lng), title: data.branch.name, label: 'K', tone: 'muted' });
  }
  for (const s of stops) {
    if (s.address.lat == null || s.address.lng == null) continue;
    pins.push({
      id: `stop-${s.delivery_id}`,
      lat: Number(s.address.lat),
      lng: Number(s.address.lng),
      title: `${s.stop_sequence}. ${s.customer_name ?? 'Customer'}`,
      description: s.address.line1 ?? undefined,
      label: String(s.stop_sequence),
      tone: s.status === 'delivered' ? 'success' : s.status === 'failed_attempt' ? 'danger' : next?.delivery_id === s.delivery_id ? 'brand' : 'info',
      highlighted: next?.delivery_id === s.delivery_id,
    });
  }

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 180, gap: 16 }}
        refreshControl={<RefreshControl refreshing={run.isRefetching} onRefresh={run.refetch} tintColor={colors.brand[500]} />}
      >
        <RunHeader run={data} />

        {data.status === 'draft' ? (
          <Card className="bg-info-soft border-info/30 gap-1">
            <Text className="font-black text-text-primary text-sm">🍳 The kitchen is preparing this route</Text>
            <Text className="text-xs text-text-secondary">
              Stops can still change. You will get a notification when the boxes are packed and labelled, then you can load the car.
            </Text>
          </Card>
        ) : null}

        {atKitchen ? <LoadingPanel run={data} /> : null}

        <DeliveryMap pins={pins} height={220} />

        {next ? (
          <Card onPress={() => router.push(`/delivery/${next.delivery_id}`)} className="border-brand-500 gap-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-brand-700">Next stop · #{next.stop_sequence}</Text>
            <Text className="text-base font-black text-text-primary">{next.customer_name ?? 'Customer'}</Text>
            <Text className="text-xs text-text-secondary" numberOfLines={1}>
              📍 {next.address.line1}
              {next.address.area ? `, ${next.address.area}` : ''}
            </Text>
            <Text className="text-xs font-bold text-brand-600 mt-1">Open stop →</Text>
          </Card>
        ) : null}

        <View className="flex-row gap-2">
          {(['all', 'pending', 'completed'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              className={cn('px-3 py-1.5 rounded-lg border', filter === f ? 'bg-brand-50 border-brand-500' : 'bg-surface border-border')}
            >
              <Text className={cn('text-xs font-bold capitalize', filter === f ? 'text-brand-700' : 'text-text-secondary')}>
                {f} ({f === 'all' ? stops.length : f === 'pending' ? pending.length : stops.length - pending.length})
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="gap-3">
          {filtered.map((stop) => {
            const isDone = stop.status === 'delivered';
            const isFailed = stop.status === 'failed_attempt';
            const isNext = next?.delivery_id === stop.delivery_id;
            return (
              <Card
                key={stop.delivery_id}
                className={cn(isDone && 'border-success/30 opacity-80', isFailed && 'border-danger/30', isNext && 'border-brand-500')}
                onPress={() => router.push(`/delivery/${stop.delivery_id}`)}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-center gap-2.5 flex-1">
                    <View
                      className={cn(
                        'h-7 w-7 rounded-full items-center justify-center',
                        isDone ? 'bg-success' : isFailed ? 'bg-danger' : isNext ? 'bg-brand-700' : 'bg-info',
                      )}
                    >
                      <Text className="text-xs font-black text-white">{stop.stop_sequence}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-extrabold text-base text-text-primary">{stop.customer_name ?? 'Customer'}</Text>
                      <Text className="text-xs text-text-secondary mt-0.5" numberOfLines={1}>
                        📍 {stop.address.line1}
                        {stop.address.area ? `, ${stop.address.area}` : ''}
                      </Text>
                    </View>
                  </View>
                  <Badge
                    label={isNext ? 'NEXT' : STOP_STATUS_LABEL[stop.status].toUpperCase()}
                    variant={isDone ? 'success' : isFailed ? 'danger' : isNext ? 'brand' : 'muted'}
                  />
                </View>
                <View className="mt-3 pt-3 border-t border-border flex-row items-center justify-between">
                  {atKitchen ? (
                    <Text className={cn('text-xs font-bold', stop.is_loaded ? 'text-success' : 'text-warning')}>
                      {stop.is_loaded ? '✓ In the car' : '○ Not loaded yet'}
                    </Text>
                  ) : (
                    <View />
                  )}
                  <Text className="text-xs text-text-muted">
                    {stop.items.length} item{stop.items.length === 1 ? '' : 's'}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>

      {data.status !== 'draft' && data.status !== 'completed' ? <QuickScanButton bottomOffset={96} /> : null}
    </View>
  );
}

function RunHeader({ run }: { run: CarRun }) {
  const pct = run.total_stops > 0 ? (run.completed_stops / run.total_stops) * 100 : 0;
  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-xs font-bold text-brand-700 uppercase tracking-wider">{run.run_code}</Text>
          <Text className="text-base font-black text-text-primary mt-0.5">
            {run.slot_name ?? 'Route'}
            {run.slot_window ? ` · ${run.slot_window}` : ''}
          </Text>
          {run.branch?.name ? <Text className="text-xs text-text-secondary">From {run.branch.name}</Text> : null}
        </View>
        <Badge
          label={RUN_STATUS_LABEL[run.status].toUpperCase()}
          variant={run.status === 'dispatched' ? 'brand' : run.status === 'completed' ? 'success' : run.status === 'draft' ? 'muted' : 'warning'}
        />
      </View>
      {run.status === 'dispatched' || run.status === 'completed' ? (
        <View>
          <View className="flex-row justify-between mb-1.5">
            <Text className="text-xs text-text-secondary font-medium">Progress</Text>
            <Text className="text-xs font-bold text-text-primary">
              {run.completed_stops} of {run.total_stops} stops
            </Text>
          </View>
          <ProgressBar pct={pct} />
        </View>
      ) : null}
    </Card>
  );
}

function ProgressBar({ pct, tone = 'brand' }: { pct: number; tone?: 'brand' | 'success' }) {
  return (
    <View className="h-2 w-full bg-surface-muted rounded-full overflow-hidden border border-border">
      <View className={cn('h-full rounded-full', tone === 'success' ? 'bg-success' : 'bg-brand-500')} style={{ width: `${Math.min(100, pct)}%` }} />
    </View>
  );
}

/** Loading at the kitchen: scan every box into the car, then start. */
function LoadingPanel({ run }: { run: CarRun }) {
  const load = useLoadBox(run.run_id);
  const start = useStartRun();
  const [scanning, setScanning] = useState(false);

  const progress = run.loading ?? { total: run.total_stops, loaded: 0, missing: [], is_complete: false, override: false };
  const pct = progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0;
  const missingStops = progress.missing.map((m) => m.stop_sequence).sort((a, b) => a - b);

  const onToken = async (token: string): Promise<ScanFeedback> => {
    try {
      const res = await load.mutateAsync(token);
      const left = res.progress.total - res.progress.loaded;
      if (res.result === 'duplicate') {
        return { tone: 'warning', message: `Stop ${res.stop_sequence} is already in the car. ${left} to go.` };
      }
      return {
        tone: 'success',
        message: left === 0 ? `Stop ${res.stop_sequence} loaded. Every box is in the car.` : `Stop ${res.stop_sequence} loaded. ${left} to go.`,
      };
    } catch (error) {
      return scanErrorFeedback(error);
    }
  };

  const onStart = () =>
    start.mutate(run.run_id, {
      onSuccess: () => toast.success('Route started. Drive safe!'),
      onError: (err) => toast.error(actionErrorMessage(err)),
    });

  const canStart = run.can_start || progress.is_complete || progress.override;

  return (
    <Card className="gap-3 border-brand-200 bg-brand-50">
      <View>
        <Text className="font-black text-brand-900 text-sm">📦 Load the car</Text>
        <Text className="text-xs text-brand-700 mt-0.5">
          Scan the QR sticker on every box as it goes into the car. Boxes of other routes are flagged.
        </Text>
      </View>

      <View>
        <View className="flex-row justify-between mb-1.5">
          <Text className="text-xs font-medium text-text-secondary">Boxes loaded</Text>
          <Text className="text-xs font-black text-text-primary">
            {progress.loaded} / {progress.total}
          </Text>
        </View>
        <ProgressBar pct={pct} tone={progress.is_complete ? 'success' : 'brand'} />
      </View>

      {missingStops.length > 0 ? (
        <Text className="text-xs text-text-secondary">
          Still missing: stop{missingStops.length === 1 ? '' : 's'} {missingStops.join(', ')}
        </Text>
      ) : null}
      {progress.override && !progress.is_complete ? (
        <Text className="text-xs font-bold text-warning">
          Dispatch allowed the start without every box. Unloaded stops come off your route.
        </Text>
      ) : null}

      <Button
        label={progress.loaded === 0 ? 'Scan boxes into the car' : 'Continue scanning'}
        size="lg"
        left={<Text>📷</Text>}
        onPress={() => setScanning(true)}
      />
      <Button
        label={canStart ? 'Start route' : `Start route (${progress.total - progress.loaded} missing)`}
        variant={canStart ? 'primary' : 'secondary'}
        size="md"
        disabled={!canStart}
        isLoading={start.isPending}
        onPress={onStart}
      />

      <BoxScanner
        open={scanning}
        eyebrow={`Loading · ${run.run_code}`}
        title="Scan each box into the car"
        continuous
        onClose={() => setScanning(false)}
        onToken={onToken}
        footer={
          <View className="gap-1.5">
            <Text className="text-sm font-bold text-white">
              {progress.loaded} of {progress.total} boxes in the car
            </Text>
            <View className="h-2 w-full overflow-hidden rounded-full bg-white/20">
              <View className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, pct)}%` }} />
            </View>
            {missingStops.length > 0 ? <Text className="text-xs text-white/70">Missing: stop {missingStops.join(', ')}</Text> : null}
          </View>
        }
      />
    </Card>
  );
}
