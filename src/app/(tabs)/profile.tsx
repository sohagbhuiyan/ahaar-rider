import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { Badge, Button, Card } from '@/components/ui';
import { useLogout, useRiderMe } from '@/lib/api/hooks/useRiderAuth';
import { useRiderDocuments } from '@/lib/api/hooks/useRiderDocuments';
import { useAuthStore } from '@/lib/auth/authStore';
import { colors } from '@/lib/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  // TanStack Query Hooks
  const { data: meData, refetch: refetchMe } = useRiderMe();
  const {
    data: docsData,
    isLoading: loadingDocs,
    isRefetching: refetchingDocs,
    refetch: refetchDocs,
  } = useRiderDocuments();
  const logoutMutation = useLogout();

  const activeProfile = meData?.driver_profile || profile;
  const documents = (docsData?.checklist ?? []).filter((d) => d.status !== 'not_submitted');

  const onRefresh = async () => {
    await Promise.all([refetchMe(), refetchDocs()]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of AHAAR Rider?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          // Always signs out locally, even if the server call fails.
          logoutMutation.mutate(undefined, {
            onSettled: () => toast.success('Signed out.'),
          });
        },
      },
    ]);
  };

  const isCar = activeProfile?.vehicle_type === 'car';

  return (
    <SafeAreaView className="flex-1 bg-surface-muted" edges={['top']}>
      {/* Top Header */}
      <View className="px-5 pt-3 pb-3 bg-surface border-b border-border">
        <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Rider Account
        </Text>
        <Text className="text-2xl font-black text-text-primary mt-0.5">Profile & Compliance</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refetchingDocs}
            onRefresh={onRefresh}
            tintColor={colors.brand[500]}
          />
        }
      >
        <View className="gap-5">
          {/* Identity Card */}
          <Card className="p-5 bg-brand-700 border-none">
            <View className="flex-row items-center">
              <View className="h-16 w-16 rounded-2xl bg-white/20 border border-white/30 items-center justify-center">
                <Text className="text-2xl font-black text-white">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AH'}
                </Text>
              </View>

              <View className="ml-4 flex-1">
                <Text className="text-xl font-black text-white">{user?.name || 'Rider'}</Text>
                <Text className="text-xs text-white/80 mt-0.5">{user?.phone || ''}</Text>
                <Text className="text-xs text-white/70">{user?.email || ''}</Text>
              </View>

              <View className="rounded-full bg-white/20 px-3 py-1 border border-white/30">
                <Text className="text-[10px] font-black uppercase text-white tracking-wider">
                  {activeProfile?.approval_status === 'approved' ? 'ACTIVE' : 'ONBOARDING'}
                </Text>
              </View>
            </View>

            <View className="mt-4 pt-3.5 border-t border-white/20 flex-row justify-between">
              <View>
                <Text className="text-[10px] uppercase font-bold text-white/70">Rider ID</Text>
                <Text className="text-sm font-bold text-white mt-0.5">
                  {user?.id ? `AR-${user.id.toString().padStart(5, '0')}` : '—'}
                </Text>
              </View>

              <View>
                <Text className="text-[10px] uppercase font-bold text-white/70">Vehicle</Text>
                <Text className="text-sm font-bold text-white mt-0.5">
                  {isCar ? '🚗 Car (Catering)' : '🏍️ Bike (Instant)'}
                </Text>
              </View>

              <View>
                <Text className="text-[10px] uppercase font-bold text-white/70">Plate</Text>
                <Text className="text-sm font-bold text-white mt-0.5">
                  {activeProfile?.vehicle_plate || '—'}
                </Text>
              </View>
            </View>
          </Card>

          {/* Operational Hub & Vehicle Info */}
          <Card className="p-4 bg-surface">
            <Text className="text-xs text-text-muted font-bold uppercase tracking-wider mb-2.5">
              Assigned Kitchen Hub
            </Text>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-base font-bold text-text-primary">
                  {activeProfile?.branch_name || 'No branch assigned'}
                </Text>
                <Text className="text-xs text-text-secondary mt-0.5">
                  Authorized for dispatch operations
                </Text>
              </View>
              {activeProfile?.branch_name ? <Badge label="YOUR HUB" variant="success" /> : null}
            </View>
          </Card>

          {/* Legal Documents & Compliance Checklist */}
          <Card className="p-4 bg-surface">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-xs text-text-muted font-bold uppercase tracking-wider">
                  Regulatory Compliance
                </Text>
                <Text className="text-base font-black text-text-primary mt-0.5">
                  Required Documents
                </Text>
              </View>
              <Badge label="STRICT COMPLIANCE" variant="outline" />
            </View>

            {loadingDocs ? (
              <View className="py-6 items-center">
                <ActivityIndicator size="small" color={colors.brand[500]} />
              </View>
            ) : documents.length === 0 ? (
              <View className="py-4 items-center">
                <Text className="text-xs text-text-muted">No documents uploaded yet.</Text>
                <Button
                  label="Upload Documents"
                  size="sm"
                  className="mt-3"
                  onPress={() => router.push('/document-upload' as any)}
                />
              </View>
            ) : (
              <View className="gap-3">
                {documents.map((doc) => {
                  const isApproved = doc.status === 'approved';
                  const isRejected = doc.status === 'rejected';
                  const isExpired = doc.status === 'expired';

                  return (
                    <View
                      key={doc.document_type}
                      className={`p-3.5 rounded-xl border ${
                        isApproved
                          ? 'border-success/30 bg-success-soft/30'
                          : isRejected
                          ? 'border-danger/40 bg-danger-soft/40'
                          : isExpired
                          ? 'border-warning/40 bg-warning-soft/40'
                          : 'border-border bg-surface-muted'
                      }`}
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 mr-2">
                          <Text className="font-bold text-sm text-text-primary">
                            {doc.title}
                          </Text>
                          {doc.document_number && (
                            <Text className="text-xs font-mono text-text-secondary mt-0.5">
                              #{doc.document_number}
                            </Text>
                          )}
                          {doc.expiry_date && (
                            <Text className="text-[11px] text-text-muted mt-0.5">
                              Expires: {doc.expiry_date}
                            </Text>
                          )}
                        </View>

                        <Badge
                          label={doc.status.replace('_', ' ').toUpperCase()}
                          variant={
                            isApproved
                              ? 'success'
                              : isRejected
                              ? 'danger'
                              : isExpired
                              ? 'warning'
                              : 'brand'
                          }
                        />
                      </View>

                      {/* If rejected, show admin reason and replacement CTA */}
                      {isRejected && (
                        <View className="mt-2.5 pt-2.5 border-t border-danger/20">
                          <Text className="text-xs font-bold text-danger">
                            Admin Rejection Reason:
                          </Text>
                          <Text className="text-xs text-danger mt-0.5">
                            {doc.rejection_reason || 'No reason given. Contact support if unsure.'}
                          </Text>
                          <Button
                            label="Replace Rejected Document"
                            size="sm"
                            variant="destructive"
                            className="mt-2"
                            onPress={() => router.push('/document-upload' as any)}
                          />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </Card>

          {/* App Info & Sign Out */}
          <View className="gap-3">
            <Button
              label="Sign Out"
              variant="outline"
              size="md"
              isLoading={logoutMutation.isPending}
              onPress={handleSignOut}
            />
            <Text className="text-[11px] text-center text-text-muted">
              AHAAR Rider · v{Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
