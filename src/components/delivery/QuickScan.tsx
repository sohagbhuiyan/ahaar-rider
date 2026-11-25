import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { BoxScanner, type ScanFeedback } from '@/components/delivery/BoxScanner';
import { Badge, Button, Sheet } from '@/components/ui';
import { errorData, errorReason } from '@/lib/api/client';
import { useLoadBox, useScanBox } from '@/lib/api/hooks/useRiderDeliveries';
import type { QuickScan, WrongRunHint } from '@/lib/api/types';
import { actionErrorMessage, callPhone, openDirections, STOP_STATUS_LABEL, wrongRunText } from '@/lib/delivery';

/** What a failed scan or load means for the rider. Never names another route's customer. */
export function scanErrorFeedback(error: unknown): ScanFeedback {
  if (errorReason(error) === 'wrong_run') {
    return { tone: 'warning', message: wrongRunText(errorData<WrongRunHint>(error)) };
  }
  return { tone: 'danger', message: actionErrorMessage(error) };
}

/**
 * The floating "Quick Scan Box" button of the car UI: scan any box in the car
 * to see its stop, dishes, phone, address, notes and directions.
 * Car drivers only; the backend refuses everyone else.
 */
export function QuickScanButton({ bottomOffset = 96 }: { bottomOffset?: number }) {
  const insets = useSafeAreaInsets();
  const scan = useScanBox();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ stop: QuickScan; token: string } | null>(null);

  const onToken = async (token: string): Promise<ScanFeedback | null> => {
    try {
      const stop = await scan.mutateAsync(token);
      setScanning(false);
      setResult({ stop, token });
      return null;
    } catch (error) {
      return scanErrorFeedback(error);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setScanning(true)}
        accessibilityRole="button"
        accessibilityLabel="Quick scan box"
        accessibilityHint="Scan any box in the car to see its stop and customer"
        style={{ bottom: bottomOffset + insets.bottom }}
        className="absolute right-5 flex-row items-center gap-2 rounded-full bg-brand-500 px-5 py-3.5 shadow-lg active:opacity-90"
      >
        <Text className="text-lg">📦</Text>
        <Text className="text-sm font-black text-text-primary">Quick Scan Box</Text>
      </Pressable>

      <BoxScanner
        open={scanning}
        eyebrow="Quick scan"
        title="Scan any box in the car"
        onClose={() => setScanning(false)}
        onToken={onToken}
      />

      {result ? <QuickScanSheet stop={result.stop} token={result.token} onClose={() => setResult(null)} /> : null}
    </>
  );
}

function QuickScanSheet({ stop, token, onClose }: { stop: QuickScan; token: string; onClose: () => void }) {
  const router = useRouter();
  const load = useLoadBox(stop.run_id);
  const a = stop.address;
  const addressLines = [a.line1, a.line2, [a.building_number, a.area, a.city].filter(Boolean).join(', ')].filter(Boolean);

  const navigate = () => {
    if (stop.maps_url) Linking.openURL(stop.maps_url);
    else openDirections({ lat: a.lat, lng: a.lng, query: addressLines.join(', ') });
  };

  const loadIt = () =>
    load.mutate(token, {
      onSuccess: (res) => {
        toast.success(res.result === 'duplicate' ? `Stop ${res.stop_sequence} was already loaded.` : `Stop ${res.stop_sequence} loaded.`);
        onClose();
      },
      onError: (err) => toast.error(scanErrorFeedback(err).message),
    });

  // The door scan already happened: the stop screen takes the token with it.
  const deliver = () => {
    onClose();
    router.push({ pathname: '/delivery/[id]', params: { id: String(stop.delivery_id), token } });
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Stop #${stop.stop_sequence} · ${stop.customer_name ?? 'Customer'}`}
      description={stop.run_code ? `${stop.slot_name ?? 'Route'} · ${stop.run_code}` : undefined}
      footer={
        <View className="gap-2">
          {stop.next_action === 'load' ? (
            <Button label="Load into the car" size="lg" isLoading={load.isPending} onPress={loadIt} />
          ) : null}
          {stop.next_action === 'deliver' ? <Button label="Deliver this box" size="lg" onPress={deliver} /> : null}
          <Button label="Close" variant="outline" size="md" onPress={onClose} />
        </View>
      }
    >
      <View className="gap-4">
        <View className="flex-row flex-wrap gap-2">
          <Badge label={STOP_STATUS_LABEL[stop.status]?.toUpperCase() ?? stop.status} variant="brand" />
          <Badge label={stop.is_loaded ? 'IN THE CAR' : 'NOT LOADED'} variant={stop.is_loaded ? 'success' : 'warning'} />
        </View>

        <View className="gap-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">Food</Text>
          {stop.items.map((item) => (
            <View key={item.id} className="flex-row items-center justify-between rounded-xl border border-border bg-surface-muted px-3 py-2">
              <Text className="flex-1 text-sm font-semibold text-text-primary">{item.name}</Text>
              <Text className="text-xs font-black text-brand-700">×{item.quantity}</Text>
            </View>
          ))}
        </View>

        <View className="gap-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">Address</Text>
          {addressLines.map((line) => (
            <Text key={line} className="text-sm text-text-primary">
              {line}
            </Text>
          ))}
          {a.short_address ? <Text className="text-xs font-mono text-text-secondary">{a.short_address}</Text> : null}
        </View>

        {a.instructions ? (
          <View className="rounded-xl border border-warning/30 bg-warning-soft p-3">
            <Text className="text-xs font-bold text-warning">Delivery note</Text>
            <Text className="mt-0.5 text-sm text-text-primary">{a.instructions}</Text>
          </View>
        ) : null}

        <View className="flex-row gap-2">
          <Button
            label={stop.customer_phone ? 'Call customer' : 'No phone'}
            variant="secondary"
            size="md"
            fullWidth={false}
            className="flex-1"
            left={<Text>📞</Text>}
            disabled={!stop.customer_phone}
            onPress={() => callPhone(stop.customer_phone)}
          />
          <Button label="Navigate" variant="outline" size="md" fullWidth={false} className="flex-1" left={<Text>🧭</Text>} onPress={navigate} />
        </View>
      </View>
    </Sheet>
  );
}
