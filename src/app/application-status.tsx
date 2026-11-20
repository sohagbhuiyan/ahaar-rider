import { useRouter } from 'expo-router';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Button, Card, type BadgeVariant } from '@/components/ui';
import { useLogout, useRiderMe } from '@/lib/api/hooks/useRiderAuth';
import { useRiderDocuments } from '@/lib/api/hooks/useRiderDocuments';
import type { ApprovalStatus } from '@/lib/api/types';
import { useAuthStore } from '@/lib/auth/authStore';
import { formatDateTime } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

const POLL_MS = 15_000;
const SUPPORT_EMAIL = 'info@ahaar.store';

type StepState = 'done' | 'current' | 'failed' | 'todo';

const STEPS = [
  { title: 'Registered', hint: 'Basic details submitted' },
  { title: 'Initial approval', hint: 'Admin reviews your registration' },
  { title: 'Documents', hint: 'Iqama, license, vehicle & Istimara' },
  { title: 'Verification', hint: 'Admin checks every document' },
  { title: 'Active', hint: 'Go online and receive deliveries' },
];

/** Which step each status sits on, and whether that step failed. */
function stepStates(status: ApprovalStatus, registrationApproved: boolean): StepState[] {
  const at = (current: number, failed = false): StepState[] =>
    STEPS.map((_, i) => (i < current ? 'done' : i === current ? (failed ? 'failed' : 'current') : 'todo'));

  switch (status) {
    case 'pending_initial_approval':
      return at(1);
    case 'approved_for_documents':
      return at(2);
    case 'under_review':
    case 'expired_documents':
      return at(3, status === 'expired_documents');
    case 'approved':
      return STEPS.map(() => 'done');
    case 'rejected':
      return at(registrationApproved ? 3 : 1, true);
    case 'suspended':
      return at(registrationApproved ? 4 : 1, true);
  }
}

export default function ApplicationStatusScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const storedStatus = profile?.approval_status;
  const shouldPoll = storedStatus === 'pending_initial_approval' || storedStatus === 'under_review';

  const { data: meData, isRefetching, refetch } = useRiderMe(true, {
    refetchInterval: shouldPoll ? POLL_MS : false,
  });
  const current = meData?.driver_profile ?? profile;
  const status: ApprovalStatus = current?.approval_status ?? 'pending_initial_approval';

  // Only needed to name which item was rejected.
  const { data: docs } = useRiderDocuments(status === 'approved_for_documents' && Boolean(current?.action_required));
  const rejectedItems = docs
    ? [
        ...docs.checklist.filter((d) => d.status === 'rejected' || d.status === 'expired').map((d) => d.title),
        ...(docs.vehicle_info.status === 'rejected' ? ['Vehicle information'] : []),
      ]
    : [];

  const logoutMutation = useLogout();
  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSuccess: () => router.replace('/') });
  };

  const steps = stepStates(status, Boolean(current?.registration_approved ?? current?.initial_approved_at));
  const contactSupport = () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Rider%20application`);

  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      <View className="flex-row items-center justify-between border-b border-border bg-surface px-6 py-4">
        <View className="flex-1 pr-3">
          <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">Application status</Text>
          <Text className="text-xl font-black text-text-primary mt-0.5" numberOfLines={1}>
            {user?.name ?? 'Rider applicant'}
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
        contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
      >
        <StateCard
          status={status}
          reason={current?.rejection_reason}
          branch={current?.branch_name}
          submittedAt={formatDateTime(current?.submitted_for_review_at)}
          actionRequired={Boolean(current?.action_required)}
          rejectedItems={rejectedItems}
          onDocuments={() => router.replace('/document-upload')}
          onDashboard={() => router.replace('/(tabs)')}
          onSupport={contactSupport}
        />

        <Card className="p-5">
          <Text className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4">Your progress</Text>
          {STEPS.map((step, i) => (
            <StepRow key={step.title} index={i} {...step} state={steps[i]} last={i === STEPS.length - 1} />
          ))}
        </Card>

        <Text className="text-center text-xs text-text-muted">
          Pull down to refresh{shouldPoll ? ' · updates automatically' : ''}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StepRow({
  index,
  title,
  hint,
  state,
  last,
}: {
  index: number;
  title: string;
  hint: string;
  state: StepState;
  last: boolean;
}) {
  const dot = {
    done: 'bg-success',
    current: 'bg-brand-500',
    failed: 'bg-danger',
    todo: 'bg-surface-muted border border-border',
  }[state];
  const glyph = state === 'done' ? '✓' : state === 'failed' ? '✕' : String(index + 1);

  return (
    <View className="flex-row gap-3">
      <View className="items-center">
        <View className={cn('h-7 w-7 rounded-full items-center justify-center', dot)}>
          <Text className={cn('text-xs font-bold', state === 'todo' ? 'text-text-muted' : 'text-text-inverse')}>
            {glyph}
          </Text>
        </View>
        {!last ? <View className={cn('w-0.5 flex-1 my-1', state === 'done' ? 'bg-success' : 'bg-border')} /> : null}
      </View>
      <View className={cn('flex-1', last ? '' : 'pb-4')}>
        <Text className={cn('text-sm font-bold', state === 'todo' ? 'text-text-muted' : 'text-text-primary')}>
          {title}
        </Text>
        <Text className="text-xs text-text-secondary mt-0.5">{hint}</Text>
      </View>
    </View>
  );
}

interface StateCardProps {
  status: ApprovalStatus;
  reason?: string | null;
  branch?: string | null;
  submittedAt: string | null;
  actionRequired: boolean;
  rejectedItems: string[];
  onDocuments: () => void;
  onDashboard: () => void;
  onSupport: () => void;
}

function StateCard(p: StateCardProps) {
  const content = describe(p);

  return (
    <Card className={cn('p-6', content.tone)}>
      <View className="items-center">
        <View className="h-16 w-16 rounded-full bg-surface items-center justify-center mb-4 border border-border">
          <Text className="text-3xl">{content.icon}</Text>
        </View>
        <Badge label={content.badge} variant={content.variant} className="mb-3 self-center" />
        <Text className="text-lg font-black text-text-primary text-center">{content.title}</Text>
        <Text className="mt-2 text-center text-sm text-text-secondary">{content.body}</Text>

        {content.reason ? (
          <View className="mt-4 w-full rounded-xl border border-danger/30 bg-danger-soft p-3">
            <Text className="text-xs font-bold uppercase text-danger">Reason from AHAAR</Text>
            <Text className="mt-1 text-sm font-semibold text-danger">{content.reason}</Text>
          </View>
        ) : null}

        {content.note ? <Text className="mt-4 text-center text-xs text-text-muted">{content.note}</Text> : null}

        {content.cta ? (
          <Button
            label={content.cta.label}
            size="lg"
            variant={content.cta.variant ?? 'primary'}
            className="mt-6 w-full"
            onPress={content.cta.onPress}
          />
        ) : null}
      </View>
    </Card>
  );
}

function describe(p: StateCardProps): {
  icon: string;
  badge: string;
  variant: BadgeVariant;
  tone: string;
  title: string;
  body: string;
  reason?: string | null;
  note?: string;
  cta?: { label: string; onPress: () => void; variant?: 'primary' | 'outline' | 'danger' };
} {
  switch (p.status) {
    case 'pending_initial_approval':
      return {
        icon: '⏳',
        badge: 'WAITING FOR APPROVAL',
        variant: 'brand',
        tone: 'border-brand-200',
        title: 'Application received',
        body: `Our operations team is reviewing your registration${p.branch ? ` for ${p.branch}` : ''}.`,
        note: 'Once approved, document upload unlocks here automatically. No documents are needed yet.',
      };
    case 'approved_for_documents':
      if (p.actionRequired) {
        return {
          icon: '⚠️',
          badge: 'ACTION REQUIRED',
          variant: 'danger',
          tone: 'bg-danger-soft border-danger/30',
          title: 'Please fix your documents',
          body:
            p.rejectedItems.length > 0
              ? `${p.rejectedItems.join(', ')} ${p.rejectedItems.length > 1 ? 'were' : 'was'} rejected. Replace only ${p.rejectedItems.length > 1 ? 'those items' : 'that item'} and submit again.`
              : 'An admin asked for a correction. Replace the rejected item and submit again.',
          cta: { label: 'Fix documents', onPress: p.onDocuments, variant: 'danger' },
        };
      }
      return {
        icon: '🎉',
        badge: 'REGISTRATION APPROVED',
        variant: 'success',
        tone: 'bg-success-soft border-success/30',
        title: 'Upload your documents',
        body: 'Add your Iqama, driving license, vehicle details and Istimara. Your progress is saved after each step.',
        cta: { label: 'Continue documents →', onPress: p.onDocuments },
      };
    case 'under_review':
      return {
        icon: '📄',
        badge: 'UNDER REVIEW',
        variant: 'info',
        tone: 'border-info/30',
        title: 'Documents being verified',
        body: 'An admin is checking each document and your vehicle. You will be activated as soon as everything is approved.',
        note: p.submittedAt ? `Submitted ${p.submittedAt}` : undefined,
        cta: { label: 'View submitted documents', onPress: p.onDocuments, variant: 'outline' },
      };
    case 'expired_documents':
      return {
        icon: '📅',
        badge: 'DOCUMENT EXPIRED',
        variant: 'warning',
        tone: 'bg-warning-soft border-warning/30',
        title: 'A document has expired',
        body: 'You cannot go online until an admin reviews your renewed document.',
        cta: { label: 'Contact support', onPress: p.onSupport, variant: 'outline' },
      };
    case 'approved':
      return {
        icon: '✅',
        badge: 'FULLY VERIFIED',
        variant: 'success',
        tone: 'bg-success-soft border-success/30',
        title: "You're activated!",
        body: 'Your account is verified. Go online from the dashboard to start receiving deliveries.',
        cta: { label: 'Open dashboard', onPress: p.onDashboard },
      };
    case 'rejected':
      return {
        icon: '✕',
        badge: 'APPLICATION REJECTED',
        variant: 'danger',
        tone: 'bg-danger-soft border-danger/30',
        title: 'Application not approved',
        body: 'Unfortunately your application could not be approved.',
        reason: p.reason ?? 'Registration criteria not met.',
        cta: { label: 'Contact support', onPress: p.onSupport, variant: 'outline' },
      };
    case 'suspended':
      return {
        icon: '⏸️',
        badge: 'ACCOUNT SUSPENDED',
        variant: 'warning',
        tone: 'bg-warning-soft border-warning/30',
        title: 'Your account is suspended',
        body: 'You cannot go online or receive deliveries while suspended.',
        reason: p.reason,
        cta: { label: 'Contact support', onPress: p.onSupport, variant: 'outline' },
      };
  }
}
