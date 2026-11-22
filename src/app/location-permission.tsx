import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RequireSession } from '@/components/session/RequireSession';
import { Button, Card } from '@/components/ui';
import { useDeliveryStore } from '@/lib/store';

const POINTS = [
  { icon: '📍', title: 'Only while delivering', body: 'Sharing starts when you accept an order or depart on a route, and stops when it ends.' },
  { icon: '👀', title: 'Who sees it', body: 'The kitchen, dispatch and the customer you are delivering to.' },
  { icon: '🔔', title: 'You will always know', body: 'A "Delivering order…" notification stays visible while sharing is on.' },
];

/**
 * Shown once per session before the system background-location prompt. On
 * Android 11+ "Allow all the time" lives in Settings, so the rider is told
 * what to pick before being sent there.
 */
export default function LocationPermissionScreen() {
  const router = useRouter();
  const setChoice = useDeliveryStore((s) => s.setBackgroundLocation);
  const [busy, setBusy] = useState(false);

  const finish = (granted: boolean) => {
    setChoice(granted ? 'granted' : 'denied');
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const allow = async () => {
    setBusy(true);
    try {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (!fg.granted) return finish(false);
      const bg = await Location.requestBackgroundPermissionsAsync();
      finish(bg.granted);
    } catch {
      finish(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <RequireSession>
      <SafeAreaView className="flex-1 bg-surface px-6 py-6 justify-between">
        <View>
          <View className="mt-6 h-20 w-20 self-center items-center justify-center rounded-3xl bg-brand-50 border border-brand-200">
            <Text className="text-4xl">🛵</Text>
          </View>
          <Text className="mt-6 text-center text-2xl font-black text-text-primary">
            Share your location while you deliver
          </Text>
          <Text className="mt-2 text-center text-sm text-text-secondary">
            So the customer can follow the order even when your phone is in your pocket or another app is open.
          </Text>

          <Card className="mt-6 gap-4">
            {POINTS.map((p) => (
              <View key={p.title} className="flex-row gap-3">
                <Text className="text-xl">{p.icon}</Text>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-text-primary">{p.title}</Text>
                  <Text className="text-xs text-text-secondary mt-0.5">{p.body}</Text>
                </View>
              </View>
            ))}
          </Card>

          {Platform.OS === 'android' ? (
            <Text className="mt-4 text-center text-xs text-text-muted">
              On the next screen choose “Allow all the time”.
            </Text>
          ) : (
            <Text className="mt-4 text-center text-xs text-text-muted">
              When asked, choose “Change to Always Allow”.
            </Text>
          )}
        </View>

        <View className="gap-3">
          <Button label="Continue" size="lg" isLoading={busy} onPress={allow} />
          <Button
            label="Only while the app is open"
            variant="ghost"
            size="md"
            disabled={busy}
            onPress={async () => {
              await Location.requestForegroundPermissionsAsync().catch(() => null);
              finish(false);
            }}
          />
        </View>
      </SafeAreaView>
    </RequireSession>
  );
}
