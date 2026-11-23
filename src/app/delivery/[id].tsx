import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { Image } from 'expo-image';

import { BoxScanner, type ScanFeedback } from '@/components/delivery/BoxScanner';
import { scanErrorFeedback } from '@/components/delivery/QuickScan';
import { RequireSession } from '@/components/session/RequireSession';
import { Badge, Button, Card, ErrorState } from '@/components/ui';
import { errorData, errorReason } from '@/lib/api/client';
import {
  useCompleteDelivery,
  useDeliveryDetail,
  useReportDeliveryIssue,
  useScanBox,
} from '@/lib/api/hooks/useRiderDeliveries';
import {
  actionErrorMessage,
  appendCoords,
  callPhone,
  currentCoords,
  formatTime,
  openDirections,
  photoPart,
  POD_OPTIONS,
  STOP_STATUS_LABEL,
  takePhoto,
} from '@/lib/delivery';
import type { PodType } from '@/lib/api/types';
import { colors } from '@/lib/theme';

export default function DeliveryStopScreen() {
  return (
    <RequireSession>
      <DeliveryStopContent />
    </RequireSession>
  );
}

function DeliveryStopContent() {
  const router = useRouter();
  // `token`: the box was already scanned via Quick Scan at the door.
  const { id, token: scannedToken } = useLocalSearchParams<{ id: string; token?: string }>();

  // TanStack Query Hooks
  const { data: delivery, isLoading, error, refetch } = useDeliveryDetail(id || '');
  const scanBox = useScanBox();
  const completeMutation = useCompleteDelivery(id || '');
  const reportIssueMutation = useReportDeliveryIssue(id || '');

  // Door scan: the box QR proves this is the right box for this stop. Sent with the completion.
  const [doorToken, setDoorToken] = useState<string | null>(typeof scannedToken === 'string' ? scannedToken : null);
  const [scanOpen, setScanOpen] = useState(false);

  // PoD Completion State
  const [podType, setPodType] = useState<PodType>('doorstep');
  const [podPhoto, setPodPhoto] = useState<string | null>(null);

  // Exception / Customer Unavailable State
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('Customer unreachable by phone');
  const [exceptionNotes, setExceptionNotes] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 min timer

  const isBagVerified = Boolean(doorToken) || delivery?.status === 'delivered';

  // 5-minute countdown for unreachable customer
  useEffect(() => {
    if (!exceptionModalOpen || timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [exceptionModalOpen, timerSeconds]);

  // Quick Action: Call Customer
  const handleCallCustomer = () => {
    if (!delivery?.customer_phone) {
      toast.error('Customer phone number not available.');
      return;
    }
    callPhone(delivery.customer_phone);
  };

  // Quick Action: Open GPS Navigation
  const handleOpenNavigation = () => {
    if (!delivery?.address) return;
    const { lat, lng, line1, area } = delivery.address;
    openDirections({ lat, lng, query: [line1, area].filter(Boolean).join(', ') });
  };

  // Step 1: scan the box QR at the door. Checked against this stop before the rider hands it over.
  const onDoorToken = async (token: string): Promise<ScanFeedback> => {
    try {
      const stop = await scanBox.mutateAsync(token);
      if (stop.delivery_id !== Number(id)) {
        return { tone: 'danger', message: `Wrong box: this one is for stop #${stop.stop_sequence}. Find the box for stop #${delivery?.stop_sequence ?? ''}.` };
      }
      setDoorToken(token);
      setScanOpen(false);
      toast.success('Right box for this customer.');
      return { tone: 'success', message: 'Right box for this customer.' };
    } catch (error) {
      return scanErrorFeedback(error);
    }
  };

  // Step 2: Take Proof-of-Delivery Photo
  const handleTakePodPhoto = async () => {
    try {
      const uri = await takePhoto();
      if (uri) setPodPhoto(uri);
    } catch {
      toast.error('Failed to open camera.');
    }
  };

  // Step 3: Complete Delivery
  const handleCompleteDelivery = async () => {
    if (!doorToken) {
      Alert.alert(
        'Scan the box first',
        'Scan the QR sticker on the box before you hand it over, so this customer gets their own meals.',
        [{ text: 'Scan box', onPress: () => setScanOpen(true) }]
      );
      return;
    }

    const formData = new FormData();
    formData.append('token', doorToken);
    formData.append('pod_type', podType);

    if (podPhoto) formData.append('photo', photoPart(podPhoto));
    appendCoords(formData, await currentCoords());

    completeMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('Delivery completed.');
        router.back();
      },
      onError: (err) => {
        const reason = errorReason(err);
        if (reason === 'wrong_package') {
          const other = errorData<{ belonging_stop?: number | null }>(err)?.belonging_stop;
          toast.error(other ? `Wrong box: this one is for stop #${other}.` : actionErrorMessage(err));
        } else {
          toast.error(actionErrorMessage(err));
        }
        // A wrong, reprinted or expired label can't be reused: scan again.
        if (reason === 'wrong_package' || reason === 'token_revoked' || reason === 'token_expired' || reason === 'invalid_token') {
          setDoorToken(null);
          refetch();
        }
      },
    });
  };

  // Exception Submission
  const handleReportIssue = () => {
    const form = new FormData();
    form.append('reason', exceptionReason);
    if (exceptionNotes.trim()) form.append('notes', exceptionNotes.trim().slice(0, 500));
    reportIssueMutation.mutate(
      form,
      {
        onSuccess: () => {
          toast.warning('Exception reported. Proceeding to next stop.');
          setExceptionModalOpen(false);
          router.back();
        },
        onError: (err) => {
          toast.error(actionErrorMessage(err));
        },
      }
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-muted items-center justify-center">
        <ActivityIndicator size="large" color={colors.brand[500]} />
        <Text className="text-sm font-semibold text-text-secondary mt-3">
          Loading stop details...
        </Text>
      </SafeAreaView>
    );
  }

  if (!delivery) {
    if (error) {
      return (
        <SafeAreaView className="flex-1 bg-surface-muted items-center justify-center">
          <ErrorState message={actionErrorMessage(error)} onRetry={() => refetch()} />
          <Button label="Go Back" variant="ghost" fullWidth={false} onPress={() => router.back()} />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView className="flex-1 bg-surface-muted p-6 items-center justify-center">
        <Text className="text-3xl mb-2">⚠️</Text>
        <Text className="text-lg font-bold text-text-primary">Delivery Not Found</Text>
        <Button label="Go Back" className="mt-4" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const isDelivered = delivery.status === 'delivered';
  const isFailed = delivery.status === 'failed_attempt';

  return (
    <SafeAreaView className="flex-1 bg-surface-muted" edges={['top']}>
      {/* Top Header */}
      <View className="px-5 pt-2 pb-3 bg-surface border-b border-border flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full bg-surface-muted border border-border"
        >
          <Text className="text-base font-bold text-text-primary">←</Text>
        </Pressable>

        <View className="items-center">
          <Text className="text-xs font-bold text-brand-700 uppercase tracking-wider">
            Stop #{delivery.stop_sequence}
          </Text>
          <Text className="text-base font-black text-text-primary">
            {delivery.customer_name}
          </Text>
        </View>

        <Badge
          label={STOP_STATUS_LABEL[delivery.status]?.toUpperCase() ?? delivery.status}
          variant={isDelivered ? 'success' : isFailed ? 'danger' : 'brand'}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
      >
        <View className="gap-4">
          {/* Customer & Location Card */}
          <Card className="p-4 bg-surface">
            <View className="flex-row items-center justify-between pb-3 border-b border-border">
              <View>
                <Text className="text-xs text-text-muted uppercase font-bold tracking-wider">
                  Customer
                </Text>
                <Text className="text-lg font-extrabold text-text-primary mt-0.5">
                  {delivery.customer_name}
                </Text>
                <Text className="text-xs text-text-secondary">
                  📞 {delivery.customer_phone || 'Number protected'}
                </Text>
              </View>

              <Pressable
                onPress={handleCallCustomer}
                className="h-10 w-10 items-center justify-center rounded-full bg-brand-50 border border-brand-200"
              >
                <Text className="text-lg">📞</Text>
              </Pressable>
            </View>

            <View className="pt-3">
              <Text className="text-xs text-text-muted uppercase font-bold tracking-wider">
                Delivery Address
              </Text>
              <Text className="text-sm font-bold text-text-primary mt-1">
                📍 {delivery.address.line1}
              </Text>
              {delivery.address.line2 && (
                <Text className="text-xs text-text-secondary mt-0.5">
                  Apt / Villa: {delivery.address.line2}
                </Text>
              )}
              {delivery.address.area && (
                <Text className="text-xs text-text-secondary mt-0.5">
                  Area: {delivery.address.area}
                </Text>
              )}
              {delivery.address.instructions && (
                <View className="mt-2.5 p-2.5 rounded-lg bg-surface-muted border border-border">
                  <Text className="text-xs font-bold text-text-primary">Note for Rider:</Text>
                  <Text className="text-xs text-text-secondary mt-0.5">
                    {delivery.address.instructions}
                  </Text>
                </View>
              )}

              <Button
                label="Navigate in Google Maps"
                variant="outline"
                size="sm"
                className="mt-3.5"
                onPress={handleOpenNavigation}
              />
            </View>
          </Card>

          {/* Meals inside Package */}
          <Card className="p-4 bg-surface">
            <Text className="text-xs text-text-muted uppercase font-bold tracking-wider mb-2.5">
              Meal Containers in Bag ({delivery.items.length})
            </Text>
            <View className="gap-2">
              {delivery.items.map((item) => (
                <View
                  key={item.id}
                  className="flex-row items-center justify-between p-2.5 rounded-xl bg-surface-muted border border-border"
                >
                  <View className="flex-1 mr-2">
                    <Text className="font-bold text-xs text-text-primary">
                      {item.name}
                    </Text>
                    {item.was_swapped && (
                      <Text className="text-[10px] text-brand-600 font-semibold mt-0.5">
                        ↻ Substituted from {item.swapped_from || 'standard menu'}
                      </Text>
                    )}
                  </View>
                  <Text className="text-xs font-black text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                    x{item.quantity}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Door scan: the box QR sticker */}
          <Card
            className={`p-4 ${
              isBagVerified
                ? 'bg-success-soft border-success/30'
                : 'bg-brand-50 border-brand-200'
            }`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <Text className="text-2xl">{isBagVerified ? '✅' : '🏷️'}</Text>
                <View>
                  <Text className="text-xs font-bold text-text-muted uppercase">
                    Door scan
                  </Text>
                  <Text className="text-sm font-black text-text-primary mt-0.5">
                    {isBagVerified ? 'Right box for this stop' : `Box for stop #${delivery.stop_sequence}`}
                  </Text>
                </View>
              </View>

              <Badge
                label={isBagVerified ? 'VERIFIED' : 'SCAN REQUIRED'}
                variant={isBagVerified ? 'success' : 'danger'}
              />
            </View>

            {!isBagVerified && (
              <View className="mt-3 pt-3 border-t border-brand-200/60">
                <Text className="text-xs text-brand-900 mb-2.5">
                  Scan the QR sticker on the box before handing it over, so this customer gets their own meals.
                </Text>
                <Button
                  label="Scan box at the door"
                  size="sm"
                  isLoading={scanBox.isPending}
                  onPress={() => setScanOpen(true)}
                />
              </View>
            )}
          </Card>

          {/* Step 2: Proof of Delivery (PoD) */}
          {!isDelivered && !isFailed && (
            <Card className="p-4 bg-surface">
              <Text className="text-xs text-text-muted uppercase font-bold tracking-wider mb-2.5">
                Proof of Delivery (PoD)
              </Text>

              {/* PoD Type Dropdown / Grid */}
              <View className="flex-row flex-wrap gap-2 mb-3">
                {POD_OPTIONS.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setPodType(item.id)}
                    className={`px-3 py-2 rounded-xl border ${
                      podType === item.id
                        ? 'bg-brand-50 border-brand-500'
                        : 'bg-surface-muted border-border'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        podType === item.id ? 'text-brand-700' : 'text-text-secondary'
                      }`}
                    >
                      {item.icon} {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Photo Snapper */}
              {podPhoto ? (
                <View className="relative rounded-2xl overflow-hidden border border-border">
                  <Image source={{ uri: podPhoto }} style={{ height: 176, width: '100%' }} contentFit="cover" />
                  <Pressable
                    onPress={() => setPodPhoto(null)}
                    className="absolute top-2 right-2 bg-black/60 rounded-full px-2.5 py-1"
                  >
                    <Text className="text-xs font-bold text-white">Retake Photo</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handleTakePodPhoto}
                  className="h-28 rounded-2xl border-2 border-dashed border-border bg-surface-muted items-center justify-center active:opacity-75"
                >
                  <Text className="text-2xl mb-1">📷</Text>
                  <Text className="text-xs font-bold text-text-primary">Take Drop-Off Photo</Text>
                  <Text className="text-[10px] text-text-muted mt-0.5">Captures bag at door / customer hands</Text>
                </Pressable>
              )}

              {/* Final Complete CTA */}
              <View className="mt-4 gap-2">
                <Button
                  label="Confirm Delivery"
                  size="lg"
                  isLoading={completeMutation.isPending}
                  onPress={handleCompleteDelivery}
                />

                <Button
                  label="Report Issue / Customer Unavailable"
                  variant="outline"
                  size="sm"
                  onPress={() => setExceptionModalOpen(true)}
                />
              </View>
            </Card>
          )}

          {/* If already delivered, show PoD summary */}
          {isDelivered && (
            <Card className="p-4 bg-success-soft border-success/30">
              <View className="flex-row items-center gap-2 mb-2">
                <Text className="text-xl">✅</Text>
                <Text className="text-base font-black text-success">
                  Delivered Successfully
                </Text>
              </View>
              <Text className="text-xs text-text-secondary">
                Delivered {formatTime(delivery.pod?.delivered_at) ? `at ${formatTime(delivery.pod?.delivered_at)}` : 'just now'}
                {delivery.pod?.pod_type
                  ? ` · ${POD_OPTIONS.find((p) => p.id === delivery.pod?.pod_type)?.label ?? delivery.pod.pod_type}`
                  : ''}
              </Text>
              {delivery.pod?.pod_photo_url && (
                <Image
                  source={{ uri: delivery.pod.pod_photo_url }}
                  style={{ marginTop: 12, height: 192, width: '100%', borderRadius: 12 }}
                  contentFit="cover"
                />
              )}
            </Card>
          )}

          {isFailed && (
            <Card className="p-4 bg-danger-soft border-danger/30">
              <Text className="text-base font-black text-danger">Delivery Failed</Text>
              <Text className="text-xs text-text-secondary mt-1">
                Reason: {delivery.failed_reason || 'Customer unavailable'}
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>

      <BoxScanner
        open={scanOpen}
        eyebrow={`Stop #${delivery.stop_sequence}`}
        title="Scan the box at the door"
        onClose={() => setScanOpen(false)}
        onToken={onDoorToken}
      />

      {/* ========================================================================= */}
      {/* MODAL: CUSTOMER UNAVAILABLE / EXCEPTION PROTOCOL                          */}
      {/* ========================================================================= */}
      <Modal
        visible={exceptionModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setExceptionModalOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-surface justify-between p-5">
          <View>
            <View className="flex-row items-center justify-between pb-3 border-b border-border">
              <View>
                <Text className="text-xs font-bold text-danger uppercase">Delivery Protocol</Text>
                <Text className="text-xl font-black text-text-primary">Customer Unreachable</Text>
              </View>
              <Pressable
                onPress={() => setExceptionModalOpen(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-surface-muted"
              >
                <Text className="font-bold text-text-secondary">✕</Text>
              </Pressable>
            </View>

            {/* 5-minute wait countdown */}
            <View className="mt-4 p-4 rounded-2xl bg-warning-soft border border-warning/30 items-center">
              <Text className="text-xs font-bold text-warning uppercase">Standard Waiting Timer</Text>
              <Text className="text-3xl font-mono font-black text-warning mt-1">
                {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
              </Text>
              <Text className="text-[11px] text-text-secondary text-center mt-1">
                Food delivery policy requires 5 minutes waiting time and 2 phone calls before marking customer unavailable.
              </Text>
              <Button
                label="Call Customer Again"
                variant="outline"
                size="sm"
                className="mt-3 bg-surface"
                onPress={handleCallCustomer}
              />
            </View>

            <View className="mt-4">
              <Text className="text-xs font-bold text-text-primary mb-1.5">Failure Reason</Text>
              <View className="gap-2">
                {[
                  'Customer unreachable by phone',
                  'Incorrect building or gate code',
                  'Customer rejected / requested cancel',
                  'Building security denied entry',
                ].map((reason) => (
                  <Pressable
                    key={reason}
                    onPress={() => setExceptionReason(reason)}
                    className={`p-3 rounded-xl border ${
                      exceptionReason === reason
                        ? 'bg-danger-soft border-danger'
                        : 'bg-surface-muted border-border'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        exceptionReason === reason ? 'text-danger' : 'text-text-primary'
                      }`}
                    >
                      {reason}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={exceptionNotes}
                onChangeText={setExceptionNotes}
                placeholder="Additional notes for kitchen/operations..."
                placeholderTextColor={colors.text.muted}
                className="mt-3 rounded-xl border border-border bg-surface-muted p-3 text-xs text-text-primary"
                multiline
                numberOfLines={2}
              />
            </View>
          </View>

          <View className="gap-2.5 pt-4 border-t border-border">
            <Button
              label="Submit Delivery Exception"
              size="lg"
              variant="destructive"
              isLoading={reportIssueMutation.isPending}
              onPress={handleReportIssue}
            />
            <Button
              label="Back to Delivery"
              variant="outline"
              size="md"
              onPress={() => setExceptionModalOpen(false)}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
