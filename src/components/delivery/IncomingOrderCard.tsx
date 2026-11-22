import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { Badge, Button } from '@/components/ui';
import { errorReason, extractErrorMessage } from '@/lib/api/client';
import {
  removeOfferFromCache,
  useAcceptOffer,
  useDeclineOffer,
  useOrder,
} from '@/lib/api/hooks/useRiderDeliveries';
import { isJob } from '@/lib/api/services/riderDeliveryService';
import { actionErrorMessage } from '@/lib/delivery';
import { useIncomingOrderAlert } from '@/lib/incomingAlert';
import { useDeliveryStore } from '@/lib/store';
import { colors } from '@/lib/theme';

import { OfferSummary } from './OfferSummary';

/**
 * The card that slides up for an `offer.new` / `offer.assigned` push while the
 * app is open. Mounted once at the root; driven by `incomingOffer` in the store.
 */
export function IncomingOrderCard() {
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const incoming = useDeliveryStore((s) => s.incomingOffer);
  const dismiss = useDeliveryStore((s) => s.dismissIncomingOffer);
  const orderId = incoming?.orderId ?? null;

  const { data, error, isLoading } = useOrder(orderId);
  const accept = useAcceptOffer();
  const decline = useDeclineOffer();
  // Which order the 409 was for, so a new card never starts as "taken".
  const [takenId, setTakenId] = useState<number | null>(null);
  const taken = takenId !== null && takenId === orderId;

  const reason = errorReason(error);
  const isGone = taken || reason === 'already_taken' || reason === 'not_yours';

  // Ring until the rider answers (accept / decline), the card goes away, or 30 s.
  const [answeredId, setAnsweredId] = useState<number | null>(null);
  const answered = answeredId !== null && answeredId === orderId;
  useIncomingOrderAlert(Boolean(orderId) && !isGone && !answered && !isJob(data), orderId);

  // Already ours (accepted on another screen): nothing to decide.
  useEffect(() => {
    if (orderId && isJob(data)) dismiss();
  }, [orderId, data, dismiss]);

  useEffect(() => {
    if (orderId && isGone) removeOfferFromCache(qc, orderId);
  }, [orderId, isGone, qc]);

  if (!incoming || !orderId) return null;

  const offer = data && !isJob(data) ? data : null;

  const onAccept = () => {
    setAnsweredId(orderId);
    accept.mutate(orderId, {
      onSuccess: () => {
        dismiss();
        toast.success('Order accepted. Head to the kitchen.');
        router.push(`/order/${orderId}`);
      },
      onError: (err) => {
        if (errorReason(err) === 'already_taken' || errorReason(err) === 'not_dispatchable') {
          setTakenId(orderId);
        } else {
          toast.error(actionErrorMessage(err));
        }
      },
    });
  };

  const onDecline = () => {
    setAnsweredId(orderId);
    decline.mutate({ orderId }, { onSettled: dismiss });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable className="flex-1 bg-black/40" onPress={isGone ? dismiss : undefined} accessibilityLabel="Close" />
      <View
        className="rounded-t-3xl bg-surface px-5 pt-3 border-t border-border"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <View className="items-center pb-3">
          <View className="h-1 w-10 rounded-full bg-border" />
        </View>

        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-xs font-bold uppercase tracking-wider text-brand-700">
              {incoming.assigned ? 'Assigned to you' : 'New order nearby'}
            </Text>
            <Text className="text-2xl font-black text-text-primary">Order #{orderId}</Text>
          </View>
          <Badge label={incoming.assigned ? 'ASSIGNED' : 'NEW'} variant={incoming.assigned ? 'info' : 'brand'} />
        </View>

        {isGone ? (
          <View className="items-center py-6">
            <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-surface-muted border border-border">
              <Text className="text-2xl">🏁</Text>
            </View>
            <Text className="text-lg font-bold text-text-primary">Taken by another rider</Text>
            <Text className="mt-1 text-center text-sm text-text-secondary">
              This order is no longer available. New orders will pop up here.
            </Text>
            <Button label="OK" variant="outline" className="mt-5" onPress={dismiss} />
          </View>
        ) : isLoading || !offer ? (
          error ? (
            <View className="items-center py-6 gap-3">
              <Text className="text-sm text-danger text-center">{extractErrorMessage(error)}</Text>
              <Button label="Close" variant="outline" onPress={dismiss} />
            </View>
          ) : (
            <View className="items-center py-10">
              <ActivityIndicator color={colors.brand[500]} />
            </View>
          )
        ) : (
          <>
            <OfferSummary offer={offer} />
            <View className="mt-5 flex-row gap-3">
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
                label="Accept"
                size="lg"
                fullWidth={false}
                className="flex-[2]"
                isLoading={accept.isPending}
                disabled={decline.isPending}
                onPress={onAccept}
              />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}
