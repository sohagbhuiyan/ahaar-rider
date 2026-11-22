import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Linking, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';

/** `AHAAR-BAG:<order_id>:<code>`, the QR on the admin order page and the bag label. */
const BAG_QR = /^AHAAR-BAG:(\d+):(\S+)$/;

export function parseBagQr(text: string): { orderId: number; code: string } | null {
  const m = BAG_QR.exec(text.trim());
  return m ? { orderId: Number(m[1]), code: m[2] } : null;
}

/** Don't flash the same wrong-bag message for every frame the QR stays in view. */
const REJECT_COOLDOWN_MS = 2500;

interface Props {
  open: boolean;
  orderId: number;
  onClose: () => void;
  /** A bag QR for this order: the raw scanned text, to send as the pickup `code`. */
  onScanned: (raw: string) => void;
}

export function BagScanner({ open, orderId, onClose, onScanned }: Props) {
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* Mounted only while open: every scan starts with fresh state and the camera off when closed. */}
      {open ? <ScannerBody orderId={orderId} onClose={onClose} onScanned={onScanned} /> : null}
    </Modal>
  );
}

function ScannerBody({ orderId, onClose, onScanned }: Omit<Props, 'open'>) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const done = useRef(false);
  const lastReject = useRef<{ data: string; at: number } | null>(null);

  const onBarcode = ({ data }: BarcodeScanningResult) => {
    if (done.current) return;
    const prev = lastReject.current;
    if (prev && prev.data === data && Date.now() - prev.at < REJECT_COOLDOWN_MS) return;

    const bag = parseBagQr(data);
    if (!bag) {
      lastReject.current = { data, at: Date.now() };
      setMessage("That isn't an Ahaar bag code. Scan the QR on the bag label or the kitchen screen.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    if (bag.orderId !== orderId) {
      lastReject.current = { data, at: Date.now() };
      setMessage(`This bag belongs to order #${bag.orderId}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    done.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onScanned(data.trim());
  };

  const granted = Boolean(permission?.granted);
  const canAsk = permission?.canAskAgain !== false;

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="flex-row items-center justify-between px-5 py-3">
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-brand-300">Pickup · Order #{orderId}</Text>
            <Text className="text-lg font-black text-white">Scan bag QR</Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/15"
          >
            <Text className="text-lg font-bold text-white">✕</Text>
          </Pressable>
        </View>

        {!permission ? (
          <View className="flex-1" />
        ) : !granted ? (
          <View className="flex-1 items-center justify-center px-8">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <Text className="text-3xl">📷</Text>
            </View>
            <Text className="text-center text-lg font-bold text-white">Allow the camera to scan bags</Text>
            <Text className="mt-2 text-center text-sm text-white/70">
              AHAAR Rider uses the camera only to read the QR code on the bag or the kitchen screen, so you
              don&apos;t have to type the pickup code. Nothing is recorded.
            </Text>
            <Button
              label={canAsk ? 'Allow camera' : 'Open settings'}
              size="lg"
              className="mt-6"
              onPress={() => (canAsk ? requestPermission() : Linking.openSettings())}
            />
            <Button label="Type the code instead" variant="ghost" size="md" className="mt-2" textClassName="text-white" onPress={onClose} />
          </View>
        ) : (
          <View className="flex-1">
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={onBarcode}
            />
            {/* Viewfinder */}
            <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
              <View className="h-64 w-64 rounded-3xl border-4 border-white/90" />
              <Text className="mt-4 text-sm font-semibold text-white">Point at the QR on the bag</Text>
            </View>
            {message ? (
              <View className="absolute left-5 right-5 top-4 rounded-2xl bg-danger px-4 py-3">
                <Text className="text-center text-sm font-bold text-white">{message}</Text>
              </View>
            ) : null}
          </View>
        )}

        {granted ? (
          <View className="flex-row gap-3 px-5 pt-3 pb-4">
            <Button
              label={torch ? 'Torch off' : 'Torch on'}
              variant="outline"
              size="md"
              fullWidth={false}
              className="flex-1 bg-transparent border-white/40"
              textClassName="text-white"
              onPress={() => setTorch((t) => !t)}
            />
            <Button
              label="Type code"
              variant="outline"
              size="md"
              fullWidth={false}
              className="flex-1 bg-transparent border-white/40"
              textClassName="text-white"
              onPress={onClose}
            />
          </View>
        ) : null}
    </View>
  );
}
