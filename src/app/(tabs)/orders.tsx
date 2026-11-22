import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { DeliveryMap, type MapPin } from '@/components/delivery/DeliveryMap';
import { OfferSummary } from '@/components/delivery/OfferSummary';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingSpinner } from '@/components/ui';
import { errorReason } from '@/lib/api/client';
import {
  useAcceptHandover,
  useAcceptOffer,
  useActiveJob,
  useCarRunsToday,
  useOffers,
} from '@/lib/api/hooks/useRiderDeliveries';
import type { CarRun, Job, Offer } from '@/lib/api/types';
import { useAuthStore } from '@/lib/auth/authStore';
import {
  actionErrorMessage,
  DELIVERY_STATUS_LABEL,
  DELIVERY_STATUS_VARIANT,
  isStopFinal,
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
// CAR: today's route
// ===========================================================================

function CarRunView() {
  const router = useRouter();
  const isOnline = useAuthStore((s) => Boolean(s.profile?.is_active));
  const run = useCarRunsToday({ isOnline });
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [handoverOpen, setHandoverOpen] = useState(false);

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
            title="No route scheduled"
            description="When the kitchen assigns today's catering run, its stops appear here in driving order."
            actionLabel="Refresh"
            onAction={() => run.refetch()}
          />
        </Card>
      </ScrollView>
    );
  }

  const stops = [...data.stops].sort((a, b) => a.stop_sequence - b.stop_sequence);
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
    <>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 110, gap: 16 }}
        refreshControl={<RefreshControl refreshing={run.isRefetching} onRefresh={run.refetch} tintColor={colors.brand[500]} />}
      >
        <RunHeader run={data} />

        <DeliveryMap pins={pins} height={240} />

        {data.status === 'ready' ? (
          <Card className="bg-brand-50 border-brand-200 gap-2">
            <Text className="font-black text-brand-900 text-sm">📦 Kitchen handover required</Text>
            <Text className="text-xs text-brand-700">
              Scan or type the code of each of the {data.total_stops} bags as you load them. You can depart once all match.
            </Text>
            <Button label="Scan bags for handover" size="md" onPress={() => setHandoverOpen(true)} />
          </Card>
        ) : null}

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
                        isDone ? 'bg-success' : isFailed ? 'bg-danger' : isNext ? 'bg-brand-500' : 'bg-info',
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
                  <Text className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                    🏷️ {stop.verification_code}
                  </Text>
                  <Text className="text-xs text-text-muted">
                    {stop.items.length} item{stop.items.length === 1 ? '' : 's'}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>

      <HandoverModal run={data} open={handoverOpen} onClose={() => setHandoverOpen(false)} />
    </>
  );
}

function RunHeader({ run }: { run: CarRun }) {
  const pct = run.total_stops > 0 ? (run.completed_stops / run.total_stops) * 100 : 0;
  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs font-bold text-brand-700 uppercase tracking-wider">{run.run_code}</Text>
          <Text className="text-base font-black text-text-primary mt-0.5">
            {run.slot_name ?? 'Route'}
            {run.slot_window ? ` · ${run.slot_window}` : ''}
          </Text>
          {run.branch?.name ? <Text className="text-xs text-text-secondary">From {run.branch.name}</Text> : null}
        </View>
        <Badge
          label={run.status === 'ready' ? 'LOADING' : run.status === 'dispatched' ? 'ON THE ROAD' : 'COMPLETED'}
          variant={run.status === 'dispatched' ? 'brand' : run.status === 'completed' ? 'success' : 'warning'}
        />
      </View>
      <View>
        <View className="flex-row justify-between mb-1.5">
          <Text className="text-xs text-text-secondary font-medium">Progress</Text>
          <Text className="text-xs font-bold text-text-primary">
            {run.completed_stops} of {run.total_stops} stops
          </Text>
        </View>
        <View className="h-2 w-full bg-surface-muted rounded-full overflow-hidden border border-border">
          <View className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
        </View>
      </View>
    </Card>
  );
}

function HandoverModal({ run, open, onClose }: { run: CarRun; open: boolean; onClose: () => void }) {
  const handover = useAcceptHandover();
  const [input, setInput] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [missing, setMissing] = useState<string[]>([]);

  const add = () => {
    const code = input.trim().toUpperCase();
    if (!code) return;
    setInput('');
    if (codes.includes(code)) {
      toast.info('Bag already scanned.');
      return;
    }
    setCodes((c) => [...c, code]);
    setMissing((m) => m.filter((x) => x !== code));
  };

  const submit = () => {
    if (codes.length === 0) {
      toast.error('Scan at least one bag first.');
      return;
    }
    handover.mutate(
      { runId: run.run_id, scannedCodes: codes },
      {
        onSuccess: (res) => {
          if (res?.all_matched) {
            toast.success('All bags verified. You can depart!');
            setCodes([]);
            setMissing([]);
            onClose();
          } else {
            setMissing(res?.missing_codes ?? []);
            toast.warning(`${res?.missing_count ?? 'Some'} bag(s) still missing.`);
          }
        },
        onError: (err) => toast.error(actionErrorMessage(err)),
      },
    );
  };

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-surface justify-between p-5">
        <View className="flex-1">
          <View className="flex-row items-center justify-between pb-3 border-b border-border">
            <View>
              <Text className="text-xs font-bold text-brand-700 uppercase tracking-wider">Handover · {run.run_code}</Text>
              <Text className="text-xl font-black text-text-primary mt-0.5">Scan route bags</Text>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Close" className="h-8 w-8 items-center justify-center rounded-full bg-surface-muted">
              <Text className="font-bold text-text-secondary">✕</Text>
            </Pressable>
          </View>

          <Text className="text-xs text-text-secondary mt-3">Type the code printed on each bag label as you load it.</Text>

          <View className="mt-4 flex-row gap-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={add}
              returnKeyType="done"
              blurOnSubmit={false}
              placeholder="Bag code"
              placeholderTextColor={colors.text.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              className="flex-1 rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-sm font-mono text-text-primary"
            />
            <Button label="Add" size="sm" fullWidth={false} className="px-5" onPress={add} />
          </View>

          <Text className="mt-3 text-xs font-bold text-text-secondary">
            Scanned {codes.length} of {run.total_stops}
          </Text>

          <ScrollView className="mt-2 flex-1 border border-border rounded-xl p-3 bg-surface-muted">
            {codes.length === 0 ? (
              <Text className="text-xs text-text-muted text-center py-6">No bags scanned yet.</Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {codes.map((code) => (
                  <View key={code} className="flex-row items-center gap-1.5 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-lg">
                    <Text className="text-xs font-mono font-bold text-brand-700">{code}</Text>
                    <Pressable onPress={() => setCodes((c) => c.filter((x) => x !== code))} hitSlop={8}>
                      <Text className="text-xs font-bold text-text-muted">×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {missing.length > 0 ? (
            <View className="mt-3 rounded-xl bg-warning-soft border border-warning/30 p-3">
              <Text className="text-xs font-bold text-warning">Still missing</Text>
              <Text className="text-xs font-mono text-text-primary mt-1">{missing.join(', ')}</Text>
            </View>
          ) : null}
        </View>

        <View className="gap-2.5 pt-4 border-t border-border">
          <Button
            label={`Verify & depart (${codes.length}/${run.total_stops})`}
            size="lg"
            isLoading={handover.isPending}
            onPress={submit}
          />
          <Button label="Cancel" variant="outline" size="md" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
