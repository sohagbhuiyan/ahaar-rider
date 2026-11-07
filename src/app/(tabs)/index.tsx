import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { Badge, Button, Card } from '@/components/ui';
import { extractErrorMessage } from '@/lib/api/client';
import { useAvailableBikeOrders, useCarRunsToday } from '@/lib/api/hooks/useRiderDeliveries';
import { useSendLocationBeacon, useToggleShiftStatus } from '@/lib/api/hooks/useRiderShift';
import { useRiderMe } from '@/lib/api/hooks/useRiderAuth';
import { useAuthStore } from '@/lib/auth/authStore';
import { useDeliveryStore } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { setActiveOrderCount } = useDeliveryStore();

  const isOnline = Boolean(profile?.is_active);
  const isCar = profile?.vehicle_type === 'car';
  const isBike = profile?.vehicle_type === 'bike';

  // TanStack Query Hooks with automatic controlled polling when online
  const { data: meData, refetch: refetchMe } = useRiderMe();
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

  const toggleShiftMutation = useToggleShiftStatus();
  const locationBeaconMutation = useSendLocationBeacon();

  const activeProfile = meData?.driver_profile || profile;

  // Sync active orders badge in client store
  useEffect(() => {
    if (isCar && carRun?.stops) {
      const pending = carRun.stops.filter((s) => s.status !== 'delivered' && s.status !== 'failed_attempt').length;
      setActiveOrderCount(pending);
    } else if (isBike) {
      setActiveOrderCount(availableOrders.length);
    }
  }, [isCar, isBike, carRun, availableOrders, setActiveOrderCount]);

  const dateLabel = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Periodic GPS location beacon when online
  useEffect(() => {
    if (!isOnline) return;

    let isMounted = true;
    const sendLocationBeacon = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted) {
          locationBeaconMutation.mutate({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            heading: loc.coords.heading ?? null,
            speed: loc.coords.speed ?? null,
          });
        }
      } catch {
        // quiet beacon fail
      }
    };

    sendLocationBeacon();
    const interval = setInterval(sendLocationBeacon, 30000); // 30 sec beacon

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOnline]);

  const isRefreshing = refetchingCarRun || refetchingOrders;

  const onRefresh = async () => {
    await Promise.all([
      refetchMe(),
      isCar ? refetchCarRun() : Promise.resolve(),
      isBike ? refetchOrders() : Promise.resolve(),
    ]);
  };

  const handleToggleOnline = (val: boolean) => {
    toggleShiftMutation.mutate(val, {
      onSuccess: () => {
        toast.success(
          val
            ? 'You are now Online and receiving deliveries'
            : 'Shift ended. You are now Offline.'
        );
      },
      onError: (err) => {
        toast.error(extractErrorMessage(err) || 'Could not update shift status.');
      },
    });
  };

  const loadingMission = isCar ? loadingCarRun : loadingOrders;

  return (
    <SafeAreaView className="flex-1 bg-surface-muted" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand[500]}
          />
        }
      >
        {/* Header Bar */}
        <View className="px-5 pt-3 pb-4 bg-surface border-b border-border">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {dateLabel}
              </Text>
              <Text className="mt-0.5 text-2xl font-black text-text-primary">
                {getGreeting()}, {user?.name?.split(' ')[0] || 'Rider'}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              className="h-11 w-11 items-center justify-center rounded-full bg-brand-50 border border-brand-200"
            >
              <Text className="text-sm font-black text-brand-700">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AH'}
              </Text>
            </Pressable>
          </View>

          {/* Branch & Vehicle Tags */}
          <View className="mt-3 flex-row items-center gap-2 flex-wrap">
            <Badge
              label={`📍 ${activeProfile?.branch_name || 'Riyadh Branch'}`}
              variant="outline"
              className="bg-surface-muted"
            />
            {isCar ? (
              <Badge
                label={`🚗 Car · ${activeProfile?.vehicle_plate || 'Catering Runs'}`}
                variant="brand"
              />
            ) : (
              <Badge
                label={`🏍️ Bike · ${activeProfile?.vehicle_plate || 'Instant Orders'}`}
                variant="info"
              />
            )}
          </View>
        </View>

        <View className="px-5 pt-5 gap-5">
          {/* Online / Offline Shift Status Toggle */}
          <Card className="p-4 bg-surface">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View
                  className={`h-3.5 w-3.5 rounded-full ${
                    isOnline ? 'bg-success ring-4 ring-success/20' : 'bg-text-muted'
                  }`}
                />
                <View>
                  <Text className="text-base font-bold text-text-primary">
                    {isOnline ? "You're Online" : "You're Offline"}
                  </Text>
                  <Text className="text-xs text-text-secondary mt-0.5">
                    {isOnline
                      ? isCar
                        ? 'Ready for scheduled catering runs'
                        : 'Active and taking instant orders'
                      : 'Toggle on to start shift and accept tasks'}
                  </Text>
                </View>
              </View>

              {toggleShiftMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.brand[500]} />
              ) : (
                <Switch
                  value={isOnline}
                  onValueChange={handleToggleOnline}
                  trackColor={{ false: colors.border.DEFAULT, true: colors.brand[500] }}
                  thumbColor={colors.surface.DEFAULT}
                />
              )}
            </View>
          </Card>

          {/* Today's Stats Cards */}
          <View className="flex-row gap-3">
            <Card className="flex-1 p-4 bg-surface">
              <Text className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Today's Earnings
              </Text>
              <Text className="mt-1.5 text-2xl font-black text-text-primary">
                SAR {isCar ? (carRun ? (carRun.completed_stops * 18).toFixed(2) : '0.00') : '142.50'}
              </Text>
              <Text className="text-[11px] text-success font-medium mt-1">
                +15% vs yesterday
              </Text>
            </Card>

            <Card className="flex-1 p-4 bg-surface">
              <Text className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Stops Delivered
              </Text>
              <Text className="mt-1.5 text-2xl font-black text-text-primary">
                {isCar ? (carRun ? `${carRun.completed_stops}/${carRun.total_stops}` : '0') : '6'}
              </Text>
              <Text className="text-[11px] text-text-secondary font-medium mt-1">
                {isCar ? 'Catering meal bags' : 'Instant orders'}
              </Text>
            </Card>
          </View>

          {/* Primary Mission Card */}
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-extrabold text-text-primary">
                {isCar ? "Today's Catering Route" : 'Active Dispatch'}
              </Text>
              <Text className="text-xs font-semibold text-brand-600">
                {isCar ? carRun?.slot_name || 'Daily Runs' : 'On-Demand'}
              </Text>
            </View>

            {loadingMission ? (
              <Card className="p-8 items-center justify-center">
                <ActivityIndicator size="small" color={colors.brand[500]} />
                <Text className="text-xs text-text-muted mt-2">Checking assignments...</Text>
              </Card>
            ) : isCar ? (
              carRun ? (
                <Card className="p-4 bg-surface border-brand-200">
                  <View className="flex-row items-center justify-between pb-3 border-b border-border">
                    <View>
                      <Text className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                        {carRun.run_code}
                      </Text>
                      <Text className="text-base font-black text-text-primary mt-0.5">
                        {carRun.slot_name} Run · {carRun.total_stops} Stops
                      </Text>
                    </View>
                    <Badge
                      label={carRun.status.toUpperCase()}
                      variant={carRun.status === 'dispatched' ? 'brand' : carRun.status === 'completed' ? 'success' : 'warning'}
                    />
                  </View>

                  <View className="py-3">
                    <View className="flex-row justify-between text-xs text-text-secondary mb-1.5">
                      <Text className="text-xs text-text-secondary font-medium">Route Progress</Text>
                      <Text className="text-xs font-bold text-text-primary">
                        {carRun.completed_stops} of {carRun.total_stops} stops completed
                      </Text>
                    </View>
                    <View className="h-2 w-full bg-surface-muted rounded-full overflow-hidden border border-border">
                      <View
                        className="h-full bg-brand-500 rounded-full"
                        style={{
                          width: `${carRun.total_stops > 0 ? (carRun.completed_stops / carRun.total_stops) * 100 : 0}%`,
                        }}
                      />
                    </View>
                  </View>

                  <View className="pt-2 flex-row gap-2">
                    <Button
                      label={
                        carRun.status === 'ready'
                          ? 'Scan Kitchen Bags & Depart'
                          : 'View Manifest & Next Stop'
                      }
                      size="md"
                      className="flex-1"
                      onPress={() => router.push('/(tabs)/orders')}
                    />
                  </View>
                </Card>
              ) : (
                <Card className="p-6 items-center bg-surface text-center">
                  <Text className="text-3xl mb-2">🍱</Text>
                  <Text className="font-bold text-text-primary text-base">No Route Assigned Yet</Text>
                  <Text className="text-xs text-text-secondary text-center mt-1 max-w-xs">
                    Subscription catering runs are batched and assigned automatically by the central kitchen before the delivery slot.
                  </Text>
                  <Button
                    label="Refresh Assignments"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onPress={() => refetchCarRun()}
                  />
                </Card>
              )
            ) : (
              /* Bike Rider View */
              <Card className="p-4 bg-surface">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xl">🛵</Text>
                    <Text className="font-bold text-text-primary">Instant Orders Available</Text>
                  </View>
                  <Badge label={`${availableOrders.length} READY`} variant={availableOrders.length > 0 ? 'success' : 'muted'} />
                </View>
                <Text className="text-xs text-text-secondary mb-4">
                  {availableOrders.length > 0
                    ? `${availableOrders.length} order(s) ready for pickup at ${activeProfile?.branch_name || 'your branch'}. Claim one to begin delivery.`
                    : 'No pending instant orders in your zone right now. We will notify you when kitchen finishes preparing next order.'}
                </Text>
                <Button
                  label="View & Claim Orders"
                  size="md"
                  onPress={() => router.push('/(tabs)/orders')}
                />
              </Card>
            )}
          </View>

          {/* Quick Shortcuts */}
          <View className="gap-2.5">
            <Text className="text-sm font-bold text-text-primary">Help & Tools</Text>
            <View className="flex-row gap-3">
              <Card
                className="flex-1 p-3.5 bg-surface items-center active:opacity-80"
                onPress={() => router.push('/(tabs)/orders')}
              >
                <Text className="text-2xl mb-1">📦</Text>
                <Text className="text-xs font-bold text-text-primary">Order Manifest</Text>
                <Text className="text-[10px] text-text-muted mt-0.5">Route & Stops</Text>
              </Card>

              <Card
                className="flex-1 p-3.5 bg-surface items-center active:opacity-80"
                onPress={() => router.push('/(tabs)/earnings')}
              >
                <Text className="text-2xl mb-1">💰</Text>
                <Text className="text-xs font-bold text-text-primary">Earnings</Text>
                <Text className="text-[10px] text-text-muted mt-0.5">Payout details</Text>
              </Card>

              <Card
                className="flex-1 p-3.5 bg-surface items-center active:opacity-80"
                onPress={() => router.push('/(tabs)/profile')}
              >
                <Text className="text-2xl mb-1">📄</Text>
                <Text className="text-xs font-bold text-text-primary">Documents</Text>
                <Text className="text-[10px] text-text-muted mt-0.5">Compliance</Text>
              </Card>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
