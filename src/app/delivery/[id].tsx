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

import { RequireSession } from '@/components/session/RequireSession';
import { Badge, Button, Card, ErrorState } from '@/components/ui';
import { errorData, errorStatus } from '@/lib/api/client';
import {
  useCompleteDelivery,
  useDeliveryDetail,
  useReportDeliveryIssue,
  useVerifyPackage,
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
  const { id } = useLocalSearchParams<{ id: string }>();

  // TanStack Query Hooks
  const { data: delivery, isLoading, error, refetch } = useDeliveryDetail(id || '');
  const verifyMutation = useVerifyPackage(id || '');
  const completeMutation = useCompleteDelivery(id || '');
  const reportIssueMutation = useReportDeliveryIssue(id || '');

  // Verification State
  const [bagVerified, setIsBagVerified] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [scannedCodeInput, setScannedCodeInput] = useState('');

  // PoD Completion State
  const [podType, setPodType] = useState<PodType>('doorstep');
  const [podPhoto, setPodPhoto] = useState<string | null>(null);

  // Exception / Customer Unavailable State
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('Customer unreachable by phone');
  const [exceptionNotes, setExceptionNotes] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 min timer

  const isBagVerified = bagVerified || delivery?.status === 'delivered';

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

  // Step 1: Bag Barcode / QR Code Verification
  const handleVerifyCode = (codeToVerify?: string) => {
    const code = (codeToVerify || scannedCodeInput).trim().toUpperCase();
    if (!code) {
      toast.error('Please enter the code printed on the bag label.');
      return;
    }

    verifyMutation.mutate(code, {
      onSuccess: (res) => {
        if (res?.matched) {
          setIsBagVerified(true);
          setVerifyModalOpen(false);
          setScannedCodeInput('');
          toast.success('Package verified: correct bag for this customer.');
        }
      },
      onError: (err) => {
        // A wrong bag is a 422 that names the stop it belongs to (on your route).
        const other = errorData<{ belonging_stop?: number | null }>(err)?.belonging_stop;
        if (errorStatus(err) === 422 && other) {
          toast.error(`Wrong bag: this one belongs to stop #${other}.`);
        } else {
          toast.error(actionErrorMessage(err));
        }
      },
    });
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
    if (!isBagVerified) {
      Alert.alert(
        'Verification Required',
        'You must verify the bag label QR code before completing delivery to prevent wrong drop-offs.',
        [{ text: 'Scan Bag', onPress: () => setVerifyModalOpen(true) }]
      );
      return;
    }

    const formData = new FormData();
    formData.append('pod_type', podType);

    if (podPhoto) formData.append('photo', photoPart(podPhoto));
    appendCoords(formData, await currentCoords());

    completeMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('Delivery completed.');
        router.back();
      },
      onError: (err) => {
        toast.error(actionErrorMessage(err));
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

          {/* Verification Step: Scan Bag QR */}
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
                    Package Verification
                  </Text>
                  <Text className="text-sm font-black text-text-primary mt-0.5">
                    {delivery.verification_code || `AH-${delivery.delivery_id}`}
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
                  Confirm package barcode before handing over to ensure this customer receives their specific meals.
                </Text>
                <Button
                  label="Scan or Enter Bag Code"
                  size="sm"
                  onPress={() => setVerifyModalOpen(true)}
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

      {/* ========================================================================= */}
      {/* MODAL: BAG CODE SCANNER / VERIFIER                                        */}
      {/* ========================================================================= */}
      <Modal
        visible={verifyModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVerifyModalOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-surface justify-between p-5">
          <View>
            <View className="flex-row items-center justify-between pb-3 border-b border-border">
              <View>
                <Text className="text-xs font-bold text-brand-700 uppercase">Verification</Text>
                <Text className="text-xl font-black text-text-primary">Scan Package Code</Text>
              </View>
              <Pressable
                onPress={() => setVerifyModalOpen(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-surface-muted"
              >
                <Text className="font-bold text-text-secondary">✕</Text>
              </Pressable>
            </View>

            <View className="mt-5 p-4 rounded-2xl bg-brand-50 border border-brand-200 items-center">
              <Text className="text-xs text-brand-700 font-bold uppercase">Expected Package Label</Text>
              <Text className="text-3xl font-mono font-black text-brand-900 mt-1">
                {delivery.verification_code || `AH-${delivery.delivery_id}`}
              </Text>
              <Text className="text-xs text-brand-700 text-center mt-2">
                Ensure this exact code is printed on the catering thermal bag.
              </Text>
            </View>

            <View className="mt-6">
              <Text className="text-xs font-bold text-text-primary mb-1.5">
                Enter or Scan Code from Bag
              </Text>
              <TextInput
                value={scannedCodeInput}
                onChangeText={setScannedCodeInput}
                placeholder={delivery.verification_code || 'AH-XX-SLOT'}
                placeholderTextColor={colors.text.muted}
                autoCapitalize="characters"
                className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-base font-mono text-text-primary"
              />
            </View>

          </View>

          <View className="gap-2.5 pt-4 border-t border-border">
            <Button
              label="Verify Package"
              size="lg"
              isLoading={verifyMutation.isPending}
              onPress={() => handleVerifyCode()}
            />
            <Button
              label="Cancel"
              variant="outline"
              size="md"
              onPress={() => setVerifyModalOpen(false)}
            />
          </View>
        </SafeAreaView>
      </Modal>

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
