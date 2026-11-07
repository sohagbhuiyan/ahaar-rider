import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { Badge, Button, Card } from '@/components/ui';
import { useLogout, useRiderMe } from '@/lib/api/hooks/useRiderAuth';
import { useAuthStore } from '@/lib/auth/authStore';

export default function ApplicationStatusScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();

  // Controlled polling every 8s while rider is waiting for approval
  const { data: meData, isRefetching, refetch } = useRiderMe();
  const logoutMutation = useLogout();

  const currentProfile = meData?.driver_profile || profile;
  const status = currentProfile?.approval_status ?? 'pending_initial_approval';

  const onRefresh = async () => {
    await refetch();
    toast.success('Status refreshed.');
  };

  const handleLogout = async () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        router.replace('/');
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border bg-surface px-6 py-4">
        <View>
          <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
            APPLICATION STATUS
          </Text>
          <Text className="text-xl font-black text-text-primary mt-0.5">
            {user?.name ?? 'Rider Candidate'}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleLogout}
          className="rounded-full bg-surface-muted px-3.5 py-1.5 border border-border"
        >
          <Text className="text-xs font-bold text-text-secondary">Logout</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
      >
        {/* Step Indicator */}
        <View className="mb-6 rounded-2xl bg-surface p-5 border border-border">
          <Text className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4">
            Verification Steps
          </Text>

          <View className="gap-3">
            {/* Stage 1 */}
            <View className="flex-row items-center gap-3">
              <View className="h-7 w-7 rounded-full bg-success items-center justify-center">
                <Text className="text-xs font-bold text-text-inverse">✓</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-text-primary">Stage 1: Basic Registration</Text>
                <Text className="text-xs text-text-secondary">Account created with phone, email, hub</Text>
              </View>
            </View>

            <View className="ml-3.5 h-4 w-0.5 bg-border" />

            {/* Stage 2 */}
            <View className="flex-row items-center gap-3">
              <View
                className={`h-7 w-7 rounded-full items-center justify-center ${
                  status === 'pending_initial_approval'
                    ? 'bg-brand-500'
                    : status === 'rejected'
                    ? 'bg-danger'
                    : 'bg-success'
                }`}
              >
                <Text className="text-xs font-bold text-text-inverse">
                  {status === 'pending_initial_approval'
                    ? '2'
                    : status === 'rejected'
                    ? '✕'
                    : '✓'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-text-primary">Stage 2: Initial Profile Review</Text>
                <Text className="text-xs text-text-secondary">Admin reviews identity before document collection</Text>
              </View>
            </View>

            <View className="ml-3.5 h-4 w-0.5 bg-border" />

            {/* Stage 3 & 4 */}
            <View className="flex-row items-center gap-3">
              <View
                className={`h-7 w-7 rounded-full items-center justify-center ${
                  status === 'approved_for_documents' || status === 'under_review'
                    ? 'bg-brand-500'
                    : status === 'approved'
                    ? 'bg-success'
                    : 'bg-surface-muted border border-border'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    status === 'approved' || status === 'approved_for_documents' || status === 'under_review'
                      ? 'text-text-inverse'
                      : 'text-text-muted'
                  }`}
                >
                  3
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-text-primary">Stage 3 & 4: Document Verification</Text>
                <Text className="text-xs text-text-secondary">Iqama, Driving License, Istimara, Car vs Bike selection</Text>
              </View>
            </View>

            <View className="ml-3.5 h-4 w-0.5 bg-border" />

            {/* Stage 5 */}
            <View className="flex-row items-center gap-3">
              <View
                className={`h-7 w-7 rounded-full items-center justify-center ${
                  status === 'approved' ? 'bg-success' : 'bg-surface-muted border border-border'
                }`}
              >
                <Text className={`text-xs font-bold ${status === 'approved' ? 'text-text-inverse' : 'text-text-muted'}`}>
                  5
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-text-primary">Stage 5: Final Activation</Text>
                <Text className="text-xs text-text-secondary">Online shift permission and order reception</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Current State Card */}
        {status === 'pending_initial_approval' && (
          <Card className="p-6 bg-surface border-brand-200">
            <View className="items-center text-center">
              <View className="h-16 w-16 rounded-full bg-brand-50 items-center justify-center mb-4">
                <Text className="text-3xl">⏳</Text>
              </View>
              <Badge label="STAGE 2: UNDER REVIEW" variant="brand" className="mb-3" />
              <Text className="text-lg font-black text-text-primary text-center">
                Application Submitted
              </Text>
              <Text className="mt-2 text-center text-sm text-text-secondary">
                Our operations team is reviewing your initial registration details for {currentProfile?.branch_name || 'Riyadh Central Branch'}.
              </Text>
              <Text className="mt-4 text-center text-xs text-text-muted">
                Once approved, the document upload wizard will unlock automatically. This typically takes 15–30 minutes during working hours.
              </Text>
            </View>
          </Card>
        )}

        {status === 'approved_for_documents' && (
          <Card className="p-6 bg-success-soft border-success/30">
            <View className="items-center text-center">
              <View className="h-16 w-16 rounded-full bg-success/20 items-center justify-center mb-4">
                <Text className="text-3xl">🎉</Text>
              </View>
              <Badge label="INITIAL APPROVAL GRANTED" variant="success" className="mb-3" />
              <Text className="text-lg font-black text-text-primary text-center">
                Profile Approved!
              </Text>
              <Text className="mt-2 text-center text-sm text-text-secondary">
                You can now proceed to Stage 3 to upload your ID, driving license, and register your vehicle.
              </Text>

              <Button
                label="Open Document Upload Wizard →"
                size="lg"
                className="mt-6 w-full"
                onPress={() => router.replace('/document-upload')}
              />
            </View>
          </Card>
        )}

        {status === 'under_review' && (
          <Card className="p-6 bg-surface border-info/30">
            <View className="items-center text-center">
              <View className="h-16 w-16 rounded-full bg-info-soft items-center justify-center mb-4">
                <Text className="text-3xl">📄</Text>
              </View>
              <Badge label="STAGE 4: DOCUMENTS SUBMITTED" variant="info" className="mb-3" />
              <Text className="text-lg font-black text-text-primary text-center">
                Documents Being Inspected
              </Text>
              <Text className="mt-2 text-center text-sm text-text-secondary">
                Your Iqama, License, and Istimara documents have been submitted to the operations administrator.
              </Text>

              <Button
                label="View Uploaded Documents"
                variant="outline"
                size="md"
                className="mt-5 w-full"
                onPress={() => router.replace('/document-upload')}
              />
            </View>
          </Card>
        )}

        {status === 'rejected' && (
          <Card className="p-6 bg-danger-soft border-danger/30">
            <View className="items-center text-center">
              <View className="h-16 w-16 rounded-full bg-danger/20 items-center justify-center mb-4">
                <Text className="text-3xl">⚠️</Text>
              </View>
              <Badge label="REGISTRATION REJECTED" variant="danger" className="mb-3" />
              <Text className="text-lg font-black text-text-primary text-center">
                Application Not Approved
              </Text>
              <Text className="mt-2 text-center text-sm text-danger font-semibold">
                Reason: {currentProfile?.rejection_reason ?? 'Registration criteria not met.'}
              </Text>
              <Text className="mt-3 text-center text-xs text-text-secondary">
                Please contact AHAAR fleet support or apply again with updated information.
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
