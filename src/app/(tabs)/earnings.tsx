import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const periodData = {
  Today: {
    total: "146.50",
    deliveries: "6",
    average: "24.42",
    bars: [36, 58, 42, 76, 50, 92, 68],
  },
  Week: {
    total: "842.00",
    deliveries: "34",
    average: "24.76",
    bars: [42, 65, 54, 88, 61, 74, 96],
  },
  Month: {
    total: "3,264.50",
    deliveries: "136",
    average: "24.00",
    bars: [54, 42, 70, 61, 88, 73, 96],
  },
} as const;

export default function EarningsScreen() {
  const [period, setPeriod] = useState<keyof typeof periodData>("Week");
  const summary = periodData[period];
  const bars = [
    { day: "M", height: summary.bars[0] },
    { day: "T", height: summary.bars[1] },
    { day: "W", height: summary.bars[2] },
    { day: "T", height: summary.bars[3] },
    { day: "F", height: summary.bars[4] },
    { day: "S", height: summary.bars[5] },
    { day: "S", height: summary.bars[6] },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#f4f6f1]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 28,
        }}
      >
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-[#68756b]">
          YOUR PAYOUTS
        </Text>
        <Text className="mt-1 text-[28px] font-extrabold text-[#17251b]">
          Earnings
        </Text>
        <Text className="mt-1 text-sm text-[#68756b]">
          A clear view of every Riyal earned.
        </Text>

        <View className="mt-6 flex-row border-b border-[#dce4dc]">
          {(["Today", "Week", "Month"] as const).map((item) => (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected: period === item }}
              onPress={() => setPeriod(item)}
              className={`mr-7 border-b-2 px-1 pb-3 ${period === item ? "border-[#24613f]" : "border-transparent"}`}
            >
              <Text
                className={`text-sm font-bold ${period === item ? "text-[#24613f]" : "text-[#89918a]"}`}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-5 border border-[#1c4e33] bg-[#1c4e33] p-5">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-[#c0d4c5]">
                {period === "Today" ? "Earned today" : `${period}ly earnings`}
              </Text>
              <Text className="mt-2 text-[32px] font-extrabold text-white">
                <Text className="text-base font-semibold text-[#c0d4c5]">
                  SAR{" "}
                </Text>
                {summary.total}
              </Text>
            </View>
            <View className="rounded-[4px] border border-[#578469] px-2.5 py-1.5">
              <Text className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#d9e8dd]">
                PAID WEEKLY
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row border-t border-[#406a4e] pt-4">
            <View className="mr-8">
              <Text className="text-xs text-[#c0d4c5]">Deliveries</Text>
              <Text className="mt-1 text-lg font-bold text-white">
                {summary.deliveries}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-[#c0d4c5]">Average / order</Text>
              <Text className="mt-1 text-lg font-bold text-white">
                SAR {summary.average}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-6 flex-row items-end justify-between">
          <View>
            <Text className="text-base font-extrabold text-[#17251b]">
              Earnings activity
            </Text>
            <Text className="mt-1 text-xs text-[#68756b]">
              Daily totals · SAR
            </Text>
          </View>
          <Text className="text-xs font-semibold text-[#68756b]">
            LAST 7 DAYS
          </Text>
        </View>

        <View className="mt-3 border border-[#e1e6de] bg-white px-4 pb-3 pt-5">
          <View className="h-[122px] flex-row items-end justify-between">
            {bars.map((bar, index) => (
              <View
                key={`${bar.day}-${index}`}
                className="h-full flex-1 items-center justify-end"
              >
                <View
                  className="mb-2 w-[55%] max-w-[22px] rounded-t-[3px] bg-[#55936d]"
                  style={{ height: `${bar.height}%` }}
                />
              </View>
            ))}
          </View>
          <View className="mt-2 flex-row justify-between border-t border-[#edf0eb] pt-2">
            {bars.map((bar, index) => (
              <Text
                key={`${bar.day}-${index}`}
                className="flex-1 text-center text-[10px] font-semibold text-[#89918a]"
              >
                {bar.day}
              </Text>
            ))}
          </View>
        </View>

        <View className="mt-6 flex-row items-center justify-between">
          <Text className="text-base font-extrabold text-[#17251b]">
            Recent activity
          </Text>
          <Text className="text-xs font-semibold text-[#24613f]">VIEW ALL</Text>
        </View>

        <View className="mt-3 border-y border-[#e1e6de] bg-white">
          {[
            {
              id: "AH-10482",
              date: "Today · 10:42 AM",
              amount: "+24.50",
              detail: "Juniper Kitchen",
            },
            {
              id: "AH-10476",
              date: "Today · 09:18 AM",
              amount: "+18.00",
              detail: "Saffron Table",
            },
            {
              id: "AH-10472",
              date: "Today · 08:34 AM",
              amount: "+21.00",
              detail: "Daily Dose Cafe",
            },
          ].map((item, index) => (
            <View
              key={item.id}
              className={`flex-row items-center justify-between px-4 py-3.5 ${index < 2 ? "border-b border-[#edf0eb]" : ""}`}
            >
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#17251b]">
                  {item.detail}
                </Text>
                <Text className="mt-1 text-xs text-[#89918a]">
                  {item.id} · {item.date}
                </Text>
              </View>
              <Text className="ml-3 text-sm font-bold text-[#24613f]">
                +SAR {item.amount}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
