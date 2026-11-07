import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';

import { queryClient } from '@/lib/api/queryClient';
import { registerForPushNotificationsAsync } from '@/lib/notifications';
import { colors } from '@/lib/theme';
import '../global.css';

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotificationsAsync();
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
              <Stack.Screen name="delivery/[id]" />
            </Stack>

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
