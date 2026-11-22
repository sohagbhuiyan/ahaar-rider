// Side-effect imports first: the location task must be defined at module
// scope before anything renders (it can run headless), the notification
// handler must be set before a push arrives, and the session module registers
// the axios 401 handler.
import '@/lib/location/backgroundLocation';
import '@/lib/notifications';
import '@/lib/session';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';

import { SessionEffects } from '@/components/session/SessionEffects';
import { queryClient } from '@/lib/api/queryClient';
import { useAuthStore } from '@/lib/auth/authStore';
import { colors } from '@/lib/theme';
import '../global.css';

export default function RootLayout() {
  const restoreToken = useAuthStore((s) => s.restoreToken);

  // Read the stored token once, before any screen decides where to go.
  useEffect(() => {
    restoreToken();
  }, [restoreToken]);

  // TanStack Query's refetchOnWindowFocus, for app foreground on native.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: colors.surface.muted },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="application-status" />
              <Stack.Screen name="document-upload" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="order/[id]" />
              <Stack.Screen name="delivery/[id]" />
              <Stack.Screen name="notifications" />
              <Stack.Screen
                name="location-permission"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
            </Stack>

            <SessionEffects />

            <Toaster
              position="top-center"
              offset={60}
              toastOptions={{
                style: { backgroundColor: colors.surface.DEFAULT },
                titleStyle: { color: colors.text.primary, fontWeight: 'bold' },
                descriptionStyle: { color: colors.text.secondary },
              }}
            />
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
