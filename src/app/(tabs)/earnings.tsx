import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Card, EmptyState, ErrorState, LoadingSpinner } from '@/components/ui';
import { useRiderStats } from '@/lib/api/hooks/useRiderDeliveries';
import { actionErrorMessage, DELIVERY_STATUS_LABEL } from '@/lib/delivery';
import { colors } from '@/lib/theme';
import { formatMoney } from '@/lib/utils';
import type { DeliveryStatus } from '@/lib/api/types';

function formatWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="flex-1 p-4">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</Text>
      <Text className="mt-1.5 text-2xl font-black text-text-primary" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hint ? <Text className="mt-1 text-[11px] text-text-secondary">{hint}</Text> : null}
    </Card>
  );
}

/**
 * Real numbers from GET /rider/stats: delivery counts and cash collected.
 * The backend has no rider pay data, so nothing here is an "earning".
 */
export default function StatsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useRiderStats();
  const isCar = data?.vehicle_type === 'car';

  return (
    <SafeAreaView className="flex-1 bg-surface-muted" edges={['top']}>
      <View className="px-5 pt-3 pb-3 bg-surface border-b border-border">
        <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">Performance</Text>
        <Text className="text-2xl font-black text-text-primary mt-0.5">Your deliveries</Text>
      </View>

      {isLoading ? (
        <LoadingSpinner label="Loading stats…" className="flex-1" />
      ) : isError || !data ? (
        <ErrorState message={actionErrorMessage(error)} onRetry={() => refetch()} className="flex-1" />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 110, gap: 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand[500]} />}
        >
          <Card className="bg-brand-700 border-transparent p-5">
            <Text className="text-xs font-bold uppercase tracking-wider text-white/80">Today</Text>
            <Text className="mt-1 text-4xl font-black text-white">{data.today.completed}</Text>
            <Text className="text-xs text-white/80">
              delivered{data.today.failed > 0 ? ` · ${data.today.failed} failed` : ''}
            </Text>
          </Card>

          <View className="flex-row gap-3">
            <Stat label="This week" value={data.week.completed} hint="delivered" />
            <Stat
              label={isCar ? 'Routes done' : 'All time'}
              value={isCar ? (data.runs_completed ?? 0) : data.total_completed}
              hint={isCar ? `${data.total_completed} stops all time` : 'delivered'}
            />
          </View>

          {!isCar ? (
            <View className="flex-row gap-3">
              <Stat label="Cash today" value={formatMoney(data.today.cash_collected, data.currency)} hint="collected on delivery" />
              <Stat label="Cash this week" value={formatMoney(data.week.cash_collected, data.currency)} hint="to hand in" />
            </View>
          ) : null}

          <View>
            <Text className="mb-3 text-sm font-bold text-text-primary">Recent</Text>
            {data.recent.length === 0 ? (
              <Card>
                <EmptyState title="No deliveries yet" description="Finished deliveries show up here." />
              </Card>
            ) : (
              <View className="gap-2.5">
                {data.recent.map((r) => {
                  const ok = r.status === 'delivered';
                  const label =
                    r.kind === 'order'
                      ? (DELIVERY_STATUS_LABEL[r.status as DeliveryStatus] ?? r.status)
                      : ok
                        ? 'Delivered'
                        : 'Failed';
                  return (
                    <Card
                      key={`${r.kind}-${r.id}`}
                      className="p-3.5"
                      onPress={() => router.push(r.kind === 'order' ? `/order/${r.id}` : `/delivery/${r.id}`)}
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="mr-2 flex-1">
                          <Text className="text-sm font-bold text-text-primary">
                            {r.kind === 'order' ? `Order #${r.id}` : `Stop #${r.id}`}
                            {r.area ? ` · ${r.area}` : ''}
                          </Text>
                          <Text className="mt-0.5 text-[11px] text-text-muted">
                            {[r.branch, formatWhen(r.at)].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        <View className="items-end gap-1">
                          <Badge label={label} variant={ok ? 'success' : 'danger'} />
                          {r.cash_collected != null && r.cash_collected > 0 ? (
                            <Text className="text-xs font-bold text-text-primary">
                              {formatMoney(r.cash_collected, r.currency ?? data.currency)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
