import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Card } from '@/components/ui';
import { useAuthStore } from '@/lib/auth/authStore';

const periodData = {
  Today: {
    total: '185.00',
    deliveries: 10,
    average: '18.50',
    baseFee: '150.00',
    bonus: '35.00',
    bars: [30, 45, 60, 40, 80, 100, 65],
  },
  Week: {
    total: '1,245.50',
    deliveries: 68,
    average: '18.32',
    baseFee: '1,020.00',
    bonus: '225.50',
    bars: [60, 75, 90, 85, 95, 100, 70],
  },
  Month: {
    total: '4,890.00',
    deliveries: 264,
    average: '18.52',
    baseFee: '4,100.00',
    bonus: '790.00',
    bars: [70, 85, 80, 95, 90, 100, 85],
  },
} as const;

export default function EarningsScreen() {
  const { profile } = useAuthStore();
  const [period, setPeriod] = useState<keyof typeof periodData>('Week');
  const summary = periodData[period];

  const isCar = profile?.vehicle_type === 'car';

  const recentTransactions = [
    {
      id: 'TXN-9021',
      title: isCar ? 'Central Hub · Lunch Catering Route' : 'Instant Order #ORD-84920',
      time: 'Today · 01:45 PM',
      amount: isCar ? '+SAR 144.00' : '+SAR 15.00',
      stops: isCar ? '8 stops completed' : 'Delivered on-time',
    },
    {
      id: 'TXN-9018',
      title: isCar ? 'Central Hub · Breakfast Route' : 'Instant Order #ORD-84891',
      time: 'Today · 08:30 AM',
      amount: isCar ? '+SAR 72.00' : '+SAR 18.00',
      stops: isCar ? '4 stops completed' : 'Delivered on-time',
    },
    {
      id: 'TXN-8994',
      title: isCar ? 'North Hub · Dinner Route' : 'Instant Order #ORD-84752',
      time: 'Yesterday · 08:15 PM',
      amount: isCar ? '+SAR 162.00' : '+SAR 16.50',
      stops: isCar ? '9 stops completed' : 'Delivered on-time',
    },
    {
      id: 'TXN-8940',
      title: isCar ? 'Central Hub · Lunch Route' : 'Instant Order #ORD-84619',
      time: '2 days ago · 01:10 PM',
      amount: isCar ? '+SAR 180.00' : '+SAR 15.00',
      stops: isCar ? '10 stops completed' : 'Delivered on-time',
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-surface-muted" edges={['top']}>
      {/* Top Header */}
      <View className="px-5 pt-3 pb-3 bg-surface border-b border-border">
        <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Your Payouts
        </Text>
        <Text className="text-2xl font-black text-text-primary mt-0.5">Earnings</Text>

        {/* Period Selector */}
        <View className="flex-row mt-3 gap-2">
          {(['Today', 'Week', 'Month'] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setPeriod(item)}
              className={`flex-1 py-1.5 items-center rounded-lg border ${
                period === item
                  ? 'bg-brand-50 border-brand-500'
                  : 'bg-surface-muted border-border'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  period === item ? 'text-brand-700' : 'text-text-secondary'
                }`}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 }}
      >
        <View className="gap-5">
          {/* Main Total Card */}
          <Card className="p-5 bg-surface">
            <Text className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Total {period} Earnings
            </Text>
            <View className="flex-row items-baseline mt-1.5">
              <Text className="text-sm font-black text-brand-700 mr-1">SAR</Text>
              <Text className="text-4xl font-black text-text-primary">{summary.total}</Text>
            </View>

            <View className="mt-4 pt-3.5 border-t border-border flex-row justify-between">
              <View>
                <Text className="text-[10px] uppercase font-bold text-text-muted">Deliveries</Text>
                <Text className="text-base font-bold text-text-primary mt-0.5">
                  {summary.deliveries} {isCar ? 'stops' : 'orders'}
                </Text>
              </View>

              <View>
                <Text className="text-[10px] uppercase font-bold text-text-muted">Avg / Drop</Text>
                <Text className="text-base font-bold text-text-primary mt-0.5">
                  SAR {summary.average}
                </Text>
              </View>

              <View>
                <Text className="text-[10px] uppercase font-bold text-text-muted">Status</Text>
                <Badge label="CLEARED" variant="success" className="mt-0.5" />
              </View>
            </View>
          </Card>

          {/* Breakdown Card */}
          <Card className="p-4 bg-surface">
            <Text className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
              Payment Breakdown
            </Text>

            <View className="gap-2.5">
              <View className="flex-row justify-between items-center py-1">
                <Text className="text-xs text-text-secondary">Base Delivery Pay</Text>
                <Text className="text-xs font-bold text-text-primary">SAR {summary.baseFee}</Text>
              </View>

              <View className="flex-row justify-between items-center py-1">
                <Text className="text-xs text-text-secondary">
                  On-Time & Route Bonus
                </Text>
                <Text className="text-xs font-bold text-success">+SAR {summary.bonus}</Text>
              </View>

              <View className="flex-row justify-between items-center pt-2.5 border-t border-border">
                <Text className="text-xs font-bold text-text-primary">Net Payable</Text>
                <Text className="text-sm font-black text-brand-700">SAR {summary.total}</Text>
              </View>
            </View>
          </Card>

          {/* Bank Transfer Notice */}
          <Card className="p-4 bg-brand-50 border-brand-200">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-lg">🏦</Text>
              <Text className="text-xs font-bold text-brand-900">Direct Bank Deposit</Text>
            </View>
            <Text className="text-xs text-brand-800">
              Payouts are transferred automatically every Tuesday to your registered Saudi IBAN. Next payout cycle starts in 2 days.
            </Text>
          </Card>

          {/* Activity / Transaction History */}
          <View>
            <Text className="text-sm font-bold text-text-primary mb-3">
              Recent Completed Dispatches
            </Text>
            <View className="gap-2.5">
              {recentTransactions.map((tx) => (
                <Card key={tx.id} className="p-3.5 bg-surface">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-2">
                      <Text className="font-bold text-xs text-text-primary">{tx.title}</Text>
                      <Text className="text-[11px] text-text-muted mt-0.5">{tx.stops}</Text>
                      <Text className="text-[10px] text-text-muted mt-0.5">{tx.time}</Text>
                    </View>
                    <Text className="font-black text-sm text-success">{tx.amount}</Text>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
