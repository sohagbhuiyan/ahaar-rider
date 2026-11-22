import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoginSheet } from '@/components/auth/LoginSheet';
import { RegisterSheet } from '@/components/auth/RegisterSheet';
import { Button, ErrorState } from '@/components/ui';
import { extractErrorMessage } from '@/lib/api/client';
import { useRiderMe } from '@/lib/api/hooks/useRiderAuth';
import { useAuthStore } from '@/lib/auth/authStore';
import { routeForStatus } from '@/lib/onboarding';
import { signOutLocally } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function WelcomeGatewayScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const profile = useAuthStore((s) => s.profile);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  // The token is restored by the root layout. With a token, the profile comes
  // from GET /rider/me; a 401 there signs out via the client interceptor.
  const { data: meData, isLoading: isQueryLoading, isError, error, refetch, isRefetching } = useRiderMe(Boolean(token));

  const activeProfile = meData?.driver_profile || profile;
  const isLoading = isInitializing || (Boolean(token) && isQueryLoading && !activeProfile);

  useEffect(() => {
    if (!isLoading && token && activeProfile) {
      router.replace(routeForStatus(activeProfile.approval_status));
    }
  }, [isLoading, token, activeProfile, router]);

  // Signed in but the server could not be reached: never fall back to the
  // sign-in buttons (that would look like being logged out).
  if (!isLoading && token && !activeProfile && isError) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface px-6">
        <ErrorState
          title="Can't reach AHAAR"
          message={extractErrorMessage(error)}
          onRetry={() => refetch()}
        />
        {isRefetching ? <ActivityIndicator color={colors.brand[500]} /> : null}
        <Button
          label="Sign out"
          variant="ghost"
          size="sm"
          fullWidth={false}
          className="mt-2"
          onPress={() => signOutLocally()}
        />
      </SafeAreaView>
    );
  }

  if (isLoading || (token && activeProfile)) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={colors.brand[500]} />
        <Text className="mt-3 text-sm font-semibold text-text-secondary">Loading AHAAR Rider...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface justify-between px-6 py-8">
      {/* Brand Header */}
      <View className="items-center mt-12">
        <View className="h-20 w-20 rounded-3xl bg-brand-50 border border-brand-200 items-center justify-center shadow-sm">
          <Text className="text-4xl">🛵</Text>
        </View>

        <Text className="mt-6 text-3xl font-black text-text-primary text-center">
          AHAAR Delivery
        </Text>
        <Text className="mt-2 text-center text-base text-text-secondary max-w-xs">
          The catering & on-demand delivery partner portal.
        </Text>
      </View>

      {/* Feature Pills */}
      <View className="gap-3.5 my-8">
        <View className="flex-row items-center gap-3.5 rounded-2xl bg-surface-muted p-4 border border-border">
          <View className="h-10 w-10 rounded-xl bg-brand-500 items-center justify-center">
            <Text className="text-lg">🚗</Text>
          </View>
          <View className="flex-1">
            <Text className="font-bold text-sm text-text-primary">Car Catering Routes</Text>
            <Text className="text-xs text-text-secondary mt-0.5">Batched meal plan deliveries organized into efficient car routes.</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-3.5 rounded-2xl bg-surface-muted p-4 border border-border">
          <View className="h-10 w-10 rounded-xl bg-info items-center justify-center">
            <Text className="text-lg">🏍️</Text>
          </View>
          <View className="flex-1">
            <Text className="font-bold text-sm text-text-primary">Bike Daily Deliveries</Text>
            <Text className="text-xs text-text-secondary mt-0.5">Instant walk-in orders with fast pickup and direct drop-off.</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-3.5 rounded-2xl bg-surface-muted p-4 border border-border">
          <View className="h-10 w-10 rounded-xl bg-success items-center justify-center">
            <Text className="text-lg">📱</Text>
          </View>
          <View className="flex-1">
            <Text className="font-bold text-sm text-text-primary">Smart QR Verification</Text>
            <Text className="text-xs text-text-secondary mt-0.5">Zero wrong deliveries with instantaneous camera barcode matching.</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="gap-3 mb-4">
        <Button
          label="Sign In as Rider"
          size="lg"
          onPress={() => setLoginOpen(true)}
        />

        <Button
          label="Apply to Deliver (Join Fleet)"
          variant="outline"
          size="lg"
          onPress={() => setRegisterOpen(true)}
        />
      </View>

      {/* Auth Bottom Sheets */}
      <LoginSheet
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onOpenRegister={() => setRegisterOpen(true)}
      />

      <RegisterSheet
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onOpenLogin={() => setLoginOpen(true)}
      />
    </SafeAreaView>
  );
}
