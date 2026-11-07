import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { Badge, Button, Card } from '@/components/ui';
import { extractErrorMessage } from '@/lib/api/client';
import {
  useAcceptHandover,
  useAvailableBikeOrders,
  useCarRunsToday,
  useClaimBikeOrder,
} from '@/lib/api/hooks/useRiderDeliveries';
import { useAuthStore } from '@/lib/auth/authStore';
import { colors } from '@/lib/theme';

export default function OrdersScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const isOnline = Boolean(profile?.is_active);
  const isCar = profile?.vehicle_type === 'car';
  const isBike = profile?.vehicle_type === 'bike';

  // TanStack Query Hooks with automatic polling when online
  const {
    data: carRun,
    isLoading: loadingCarRun,
    isRefetching: refetchingCarRun,
    refetch: refetchCarRun,
  } = useCarRunsToday({ isOnline, enabled: isCar });

  const {
    data: availableOrders = [],
    isLoading: loadingOrders,
    isRefetching: refetchingOrders,
    refetch: refetchOrders,
  } = useAvailableBikeOrders({ isOnline, enabled: isBike });

  const acceptHandoverMutation = useAcceptHandover();
  const claimOrderMutation = useClaimBikeOrder();

  // Car Track Local State
  const [carFilter, setCarFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [scannedBagInput, setScannedBagInput] = useState('');
  const [scannedBagCodes, setScannedBagCodes] = useState<string[]>([]);

  // Bike Track Local State
  const [bikeTab, setBikeTab] = useState<'available' | 'active'>('available');

  const isLoading = isCar ? loadingCarRun : loadingOrders;
  const isRefreshing = isCar ? refetchingCarRun : refetchingOrders;

  const onRefresh = async () => {
    if (isCar) await refetchCarRun();
    if (isBike) await refetchOrders();
  };

  // Car Track: Kitchen Bulk Bag Handover
  const handleAddScannedCode = () => {
    const code = scannedBagInput.trim().toUpperCase();
    if (!code) return;
    if (scannedBagCodes.includes(code)) {
      toast.info('Bag already in scan list.');
      setScannedBagInput('');
      return;
    }
    setScannedBagCodes([...scannedBagCodes, code]);
    setScannedBagInput('');
  };

  const handleSimulateQuickScanAll = () => {
    if (!carRun?.stops) return;
    const allCodes = carRun.stops.map((s) => s.verification_code).filter(Boolean);
    setScannedBagCodes(allCodes);
    toast.success(`Loaded all ${allCodes.length} bag verification codes!`);
  };

  const handleSubmitHandover = () => {
    if (!carRun) return;
    if (scannedBagCodes.length === 0) {
      toast.error('Please scan at least one bag before confirming handover.');
      return;
    }

    acceptHandoverMutation.mutate(
      { runId: carRun.run_id, scannedCodes: scannedBagCodes },
      {
        onSuccess: (res) => {
          if (res?.all_matched) {
            toast.success('All packages verified! Ready to depart.');
            setHandoverModalOpen(false);
          } else {
            toast.warning('Some packages are missing from the scan.');
          }
        },
        onError: (err) => {
          toast.error(extractErrorMessage(err) || 'Handover verification failed.');
        },
      }
    );
  };

  // Bike Track: Claim Instant Order
  const handleClaimOrder = (orderId: number) => {
    claimOrderMutation.mutate(orderId, {
      onSuccess: () => {
        toast.success('Order claimed! Proceed to kitchen pickup.');
        setBikeTab('active');
      },
      onError: (err) => {
        toast.error(extractErrorMessage(err) || 'Could not claim order.');
      },
    });
  };

  const filteredStops =
    carRun?.stops.filter((stop) => {
      if (carFilter === 'pending') return stop.status !== 'delivered' && stop.status !== 'failed_attempt';
      if (carFilter === 'completed') return stop.status === 'delivered' || stop.status === 'failed_attempt';
      return true;
    }) || [];

  return (
    <SafeAreaView className="flex-1 bg-surface-muted" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-3 pb-3 bg-surface border-b border-border">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {isCar ? 'Catering Manifest' : 'Instant Dispatch'}
            </Text>
            <Text className="text-2xl font-black text-text-primary mt-0.5">
              {isCar ? "Today's Delivery Route" : 'Available Orders'}
            </Text>
          </View>
          <Badge
            label={isCar ? 'CAR BATCH' : 'BIKE DIRECT'}
            variant={isCar ? 'brand' : 'info'}
          />
        </View>

        {/* Filter / Segmented Buttons */}
        {isCar && carRun && (
          <View className="flex-row mt-3 gap-2">
            {(['all', 'pending', 'completed'] as const).map((filter) => (
              <Pressable
                key={filter}
                onPress={() => setCarFilter(filter)}
                className={`px-3 py-1.5 rounded-lg border ${
                  carFilter === filter
                    ? 'bg-brand-50 border-brand-500'
                    : 'bg-surface-muted border-border'
                }`}
              >
                <Text
                  className={`text-xs font-bold capitalize ${
                    carFilter === filter ? 'text-brand-700' : 'text-text-secondary'
                  }`}
                >
                  {filter} (
                  {filter === 'all'
                    ? carRun.stops.length
                    : filter === 'pending'
                    ? carRun.stops.length - carRun.completed_stops
                    : carRun.completed_stops}
                  )
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {isBike && (
          <View className="flex-row mt-3 gap-2">
            <Pressable
              onPress={() => setBikeTab('available')}
              className={`flex-1 py-2 items-center rounded-lg border ${
                bikeTab === 'available'
                  ? 'bg-brand-50 border-brand-500'
                  : 'bg-surface-muted border-border'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  bikeTab === 'available' ? 'text-brand-700' : 'text-text-secondary'
                }`}
              >
                Available ({availableOrders.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setBikeTab('active')}
              className={`flex-1 py-2 items-center rounded-lg border ${
                bikeTab === 'active'
                  ? 'bg-brand-50 border-brand-500'
                  : 'bg-surface-muted border-border'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  bikeTab === 'active' ? 'text-brand-700' : 'text-text-secondary'
                }`}
              >
                My Active Order
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand[500]}
          />
        }
      >
        {isLoading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color={colors.brand[500]} />
            <Text className="text-sm font-semibold text-text-secondary mt-3">
              Loading deliveries...
            </Text>
          </View>
        ) : isCar ? (
          /* ========================================================================= */
          /* CAR TRACK: CATERING MANIFEST VIEW                                         */
          /* ========================================================================= */
          carRun ? (
            <View className="gap-4">
              {/* Kitchen Handover Banner */}
              {carRun.status === 'ready' && (
                <Card className="p-4 bg-brand-50 border-brand-200">
                  <View className="flex-row items-center gap-2 mb-1.5">
                    <Text className="text-xl">📦</Text>
                    <Text className="font-black text-brand-900 text-sm">
                      Kitchen Loading Handover Required
                    </Text>
                  </View>
                  <Text className="text-xs text-brand-700 mb-3">
                    Scan all {carRun.total_stops} customer meal bags into your car trunk before departing the central kitchen to prevent misplaced deliveries.
                  </Text>
                  <Button
                    label="Scan Bags for Handover"
                    size="sm"
                    onPress={() => setHandoverModalOpen(true)}
                  />
                </Card>
              )}

              {/* Stop Sequence List */}
              <View className="gap-3">
                {filteredStops.map((stop) => {
                  const isDone = stop.status === 'delivered';
                  const isFailed = stop.status === 'failed_attempt';

                  return (
                    <Card
                      key={stop.delivery_id}
                      className={`p-4 bg-surface ${
                        isDone ? 'border-success/30 opacity-80' : isFailed ? 'border-danger/30' : 'border-border'
                      }`}
                      onPress={() => router.push(`/delivery/${stop.delivery_id}` as any)}
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-row items-center gap-2.5 flex-1">
                          {/* Stop Sequence Circle */}
                          <View
                            className={`h-7 w-7 rounded-full items-center justify-center ${
                              isDone ? 'bg-success text-white' : isFailed ? 'bg-danger text-white' : 'bg-brand-500'
                            }`}
                          >
                            <Text className="text-xs font-black text-white">
                              {stop.stop_sequence}
                            </Text>
                          </View>

                          <View className="flex-1">
                            <Text className="font-extrabold text-base text-text-primary">
                              {stop.customer_name}
                            </Text>
                            <Text className="text-xs text-text-secondary mt-0.5" numberOfLines={1}>
                              📍 {stop.address.line1}{stop.address.area ? `, ${stop.address.area}` : ''}
                            </Text>
                          </View>
                        </View>

                        <Badge
                          label={
                            isDone ? 'DELIVERED' : isFailed ? 'FAILED' : stop.status === 'out_for_delivery' ? 'NEXT' : 'PACKED'
                          }
                          variant={isDone ? 'success' : isFailed ? 'danger' : stop.status === 'out_for_delivery' ? 'brand' : 'muted'}
                        />
                      </View>

                      {/* Items & Bag Verification Code */}
                      <View className="mt-3 pt-3 border-t border-border flex-row items-center justify-between">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                            🏷️ {stop.verification_code || `AH-${stop.delivery_id}`}
                          </Text>
                          <Text className="text-xs text-text-muted">
                            ({stop.items?.length || 1} meal item{stop.items?.length > 1 ? 's' : ''})
                          </Text>
                        </View>

                        <Text className="text-xs font-bold text-brand-600">
                          {isDone ? 'View PoD →' : 'Deliver Stop →'}
                        </Text>
                      </View>
                    </Card>
                  );
                })}
              </View>
            </View>
          ) : (
            <Card className="p-8 items-center justify-center bg-surface text-center">
              <Text className="text-4xl mb-3">🚗</Text>
              <Text className="text-lg font-bold text-text-primary">No Route Scheduled</Text>
              <Text className="text-xs text-text-secondary text-center mt-1 max-w-xs">
                When kitchen dispatches the lunch or dinner catering batch for your branch, stops will appear here in optimal driving order.
              </Text>
              <Button
                label="Refresh Manifest"
                variant="outline"
                size="sm"
                className="mt-4"
                onPress={() => refetchCarRun()}
              />
            </Card>
          )
        ) : (
          /* ========================================================================= */
          /* BIKE TRACK: INSTANT ORDERS VIEW                                           */
          /* ========================================================================= */
          bikeTab === 'available' ? (
            availableOrders.length > 0 ? (
              <View className="gap-3">
                {availableOrders.map((order) => (
                  <Card key={order.order_id} className="p-4 bg-surface border-border">
                    <View className="flex-row items-start justify-between">
                      <View>
                        <Text className="text-xs font-bold text-brand-700">
                          ORD #{order.order_id}
                        </Text>
                        <Text className="font-extrabold text-base text-text-primary mt-0.5">
                          {order.customer_name || 'Walk-in Customer'}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-base font-black text-brand-700">
                          SAR {order.total_amount.toFixed(2)}
                        </Text>
                        <Text className="text-[10px] text-text-muted">Direct Payment</Text>
                      </View>
                    </View>

                    <View className="mt-3 gap-1 bg-surface-muted p-2.5 rounded-xl border border-border">
                      <Text className="text-xs text-text-secondary">
                        <Text className="font-bold text-text-primary">Pickup:</Text> {order.branch_name || 'AHAAR Kitchen'}
                      </Text>
                      <Text className="text-xs text-text-secondary">
                        <Text className="font-bold text-text-primary">Items:</Text> {order.items_count} dish(es) ready to pack
                      </Text>
                    </View>

                    <View className="mt-3.5 flex-row gap-2">
                      <Button
                        label="Claim Order"
                        size="sm"
                        className="flex-1"
                        isLoading={claimOrderMutation.isPending}
                        onPress={() => handleClaimOrder(order.order_id)}
                      />
                    </View>
                  </Card>
                ))}
              </View>
            ) : (
              <Card className="p-8 items-center justify-center bg-surface text-center">
                <Text className="text-4xl mb-3">🛵</Text>
                <Text className="text-base font-bold text-text-primary">No Instant Orders Available</Text>
                <Text className="text-xs text-text-secondary text-center mt-1 max-w-xs">
                  New on-demand customer orders will be listed here immediately once prepared by kitchen.
                </Text>
                <Button
                  label="Refresh Available Orders"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onPress={() => refetchOrders()}
                />
              </Card>
            )
          ) : (
            <Card className="p-8 items-center justify-center bg-surface text-center">
              <Text className="text-4xl mb-3">📍</Text>
              <Text className="text-base font-bold text-text-primary">No Active Claimed Order</Text>
              <Text className="text-xs text-text-secondary text-center mt-1 max-w-xs">
                Switch to the "Available" tab and claim an order to start delivery.
              </Text>
              <Button
                label="Go to Available Tab"
                size="sm"
                className="mt-4"
                onPress={() => setBikeTab('available')}
              />
            </Card>
          )
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL: KITCHEN BULK BAG HANDOVER (Car Drivers)                            */}
      {/* ========================================================================= */}
      <Modal
        visible={handoverModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setHandoverModalOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-surface justify-between p-5">
          <View>
            <View className="flex-row items-center justify-between pb-3 border-b border-border">
              <View>
                <Text className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                  Handover Verification
                </Text>
                <Text className="text-xl font-black text-text-primary mt-0.5">
                  Scan Route Packages
                </Text>
              </View>
              <Pressable
                onPress={() => setHandoverModalOpen(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-surface-muted"
              >
                <Text className="font-bold text-text-secondary">✕</Text>
              </Pressable>
            </View>

            <Text className="text-xs text-text-secondary mt-3">
              Scan or enter each customer meal bag's verification QR code (e.g. AH-42-LUNCH) as you load them into your car.
            </Text>

            {/* Input & Quick Scan Tools */}
            <View className="mt-4 flex-row gap-2">
              <TextInput
                value={scannedBagInput}
                onChangeText={setScannedBagInput}
                placeholder="Enter Bag Code (e.g. AH-12)"
                placeholderTextColor={colors.text.muted}
                autoCapitalize="characters"
                className="flex-1 rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-sm font-mono text-text-primary"
              />
              <Button label="Add" size="sm" onPress={handleAddScannedCode} />
            </View>

            <View className="mt-2.5 flex-row justify-between items-center">
              <Text className="text-xs font-bold text-text-secondary">
                Scanned: {scannedBagCodes.length} of {carRun?.total_stops || 0}
              </Text>
              <Pressable onPress={handleSimulateQuickScanAll}>
                <Text className="text-xs font-bold text-brand-600 underline">
                  Load All Manifest Codes
                </Text>
              </Pressable>
            </View>

            {/* Scanned Badges */}
            <ScrollView className="max-h-60 mt-3 border border-border rounded-xl p-3 bg-surface-muted">
              {scannedBagCodes.length === 0 ? (
                <Text className="text-xs text-text-muted text-center py-6">
                  No bags scanned yet.
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {scannedBagCodes.map((code) => (
                    <View
                      key={code}
                      className="flex-row items-center gap-1.5 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-lg"
                    >
                      <Text className="text-xs font-mono font-bold text-brand-700">
                        {code}
                      </Text>
                      <Pressable
                        onPress={() =>
                          setScannedBagCodes(scannedBagCodes.filter((c) => c !== code))
                        }
                      >
                        <Text className="text-xs font-bold text-text-muted">×</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>

          <View className="gap-2.5 pt-4 border-t border-border">
            <Button
              label={`Verify & Depart (${scannedBagCodes.length}/${carRun?.total_stops || 0} Bags)`}
              size="lg"
              isLoading={acceptHandoverMutation.isPending}
              onPress={handleSubmitHandover}
            />
            <Button
              label="Cancel"
              variant="outline"
              size="md"
              onPress={() => setHandoverModalOpen(false)}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
