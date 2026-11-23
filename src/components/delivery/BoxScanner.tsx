import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRef, useState, type ReactNode } from 'react';
import { Linking, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { normalizeBoxToken } from '@/lib/delivery';
import { cn } from '@/lib/utils';

/** What the screen made of a scan, shown over the camera. */
export interface ScanFeedback {
  tone: 'success' | 'warning' | 'danger';
  message: string;
}

interface Props {
  open: boolean;
  /** Small line above the title, e.g. "Loading · CR-20261123-OLY-L1". */
  eyebrow: string;
  title: string;
  onClose: () => void;
  /**
   * A box label was read (canonical `AHR-XXXXXX`). Resolve with feedback to
   * show; in single mode the scanner stays closed-over until the parent closes it.
   */
  onToken: (token: string) => Promise<ScanFeedback | null> | ScanFeedback | null;
  /** Keep scanning box after box (loading). Otherwise one good scan ends it. */
  continuous?: boolean;
  /** Under the camera: e.g. the loading progress. */
  footer?: ReactNode;
}

/** The same QR stays in view for many frames: ignore it for a moment. */
const SAME_CODE_COOLDOWN_MS = 2500;

export function BoxScanner(props: Props) {
  return (
    <Modal visible={props.open} animationType="slide" onRequestClose={props.onClose} statusBarTranslucent>
      {/* Mounted only while open: fresh state each time, camera off when closed. */}
      {props.open ? <ScannerBody {...props} /> : null}
    </Modal>
  );
}

const HAPTIC = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  danger: Haptics.NotificationFeedbackType.Error,
} as const;

function ScannerBody({ eyebrow, title, onClose, onToken, continuous = false, footer }: Omit<Props, 'open'>) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [torch, setTorch] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const busy = useRef(false);
  const done = useRef(false);
  const last = useRef<{ data: string; at: number } | null>(null);

  const show = (next: ScanFeedback) => {
    setFeedback(next);
    Haptics.notificationAsync(HAPTIC[next.tone]).catch(() => {});
  };

  const handle = async (raw: string) => {
    if (busy.current || done.current) return;
    const token = normalizeBoxToken(raw);
    if (!token) {
      show({ tone: 'danger', message: "That isn't an Ahaar box label. Scan the QR on the box sticker." });
      return;
    }
    busy.current = true;
    try {
      const result = await onToken(token);
      if (result) show(result);
      if (!continuous && result?.tone !== 'danger') done.current = true;
    } finally {
      busy.current = false;
    }
  };

  const onBarcode = ({ data }: BarcodeScanningResult) => {
    const prev = last.current;
    if (prev && prev.data === data && Date.now() - prev.at < SAME_CODE_COOLDOWN_MS) return;
    last.current = { data, at: Date.now() };
    handle(data);
  };

  const submitTyped = () => {
    const text = typed;
    setTyped('');
    handle(text);
  };

  const granted = Boolean(permission?.granted);
  const canAsk = permission?.canAskAgain !== false;

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="flex-row items-center justify-between px-5 py-3">
        <View className="flex-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-brand-300">{eyebrow}</Text>
          <Text className="text-lg font-black text-white">{title}</Text>
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
      ) : !granted && !typing ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <Text className="text-3xl">📷</Text>
          </View>
          <Text className="text-center text-lg font-bold text-white">Allow the camera to scan boxes</Text>
          <Text className="mt-2 text-center text-sm text-white/70">
            AHAAR Rider uses the camera only to read the QR on each box sticker. Nothing is recorded.
          </Text>
          <Button
            label={canAsk ? 'Allow camera' : 'Open settings'}
            size="lg"
            className="mt-6"
            onPress={() => (canAsk ? requestPermission() : Linking.openSettings())}
          />
          <Button label="Type the label code" variant="ghost" size="md" className="mt-2" textClassName="text-white" onPress={() => setTyping(true)} />
        </View>
      ) : (
        <View className="flex-1">
          {granted ? (
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={onBarcode}
            />
          ) : (
            <View className="flex-1" />
          )}
          {granted ? (
            <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
              <View className="h-64 w-64 rounded-3xl border-4 border-white/90" />
              <Text className="mt-4 text-sm font-semibold text-white">Point at the QR on the box sticker</Text>
            </View>
          ) : null}
          {feedback ? (
            <View
              accessibilityLiveRegion="polite"
              className={cn(
                'absolute left-5 right-5 top-4 rounded-2xl px-4 py-3',
                feedback.tone === 'success' ? 'bg-success' : feedback.tone === 'warning' ? 'bg-warning' : 'bg-danger',
              )}
            >
              <Text className="text-center text-sm font-bold text-white">{feedback.message}</Text>
            </View>
          ) : null}
        </View>
      )}

      {footer ? <View className="px-5 pt-3">{footer}</View> : null}

      {typing ? (
        <View className="flex-row gap-2 px-5 pt-3">
          <TextInput
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={submitTyped}
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            placeholder="AHR-9X4K2M"
            placeholderTextColor="rgba(255,255,255,0.5)"
            accessibilityLabel="Box label code"
            className="flex-1 rounded-xl border border-white/40 px-4 py-2.5 font-mono text-base text-white"
          />
          <Button label="Check" size="md" fullWidth={false} className="px-5" onPress={submitTyped} />
        </View>
      ) : null}

      <View className="flex-row gap-3 px-5 pt-3 pb-4">
        {granted ? (
          <Button
            label={torch ? 'Torch off' : 'Torch on'}
            variant="outline"
            size="md"
            fullWidth={false}
            className="flex-1 bg-transparent border-white/40"
            textClassName="text-white"
            onPress={() => setTorch((t) => !t)}
          />
        ) : null}
        <Button
          label={typing ? 'Hide keyboard entry' : 'Type code'}
          variant="outline"
          size="md"
          fullWidth={false}
          className="flex-1 bg-transparent border-white/40"
          textClassName="text-white"
          onPress={() => setTyping((v) => !v)}
        />
      </View>
    </View>
  );
}
