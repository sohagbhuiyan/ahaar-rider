import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EarningsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20 }}
      >
        <Text className="text-2xl font-bold text-gray-900">
          Earnings
        </Text>

        <Text className="mt-1 text-sm text-gray-500">
          Track your income
        </Text>

        {/* Total */}
        <View className="mt-6 rounded-2xl bg-gray-900 p-5">
          <Text className="text-sm text-gray-400">
            This week
          </Text>

          <Text className="mt-2 text-3xl font-bold text-white">
            SAR 385.50
          </Text>

          <View className="mt-5 flex-row">
            <View className="flex-1">
              <Text className="text-xs text-gray-400">
                Deliveries
              </Text>

              <Text className="mt-1 font-bold text-white">
                42
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-xs text-gray-400">
                Average
              </Text>

              <Text className="mt-1 font-bold text-white">
                SAR 9.18
              </Text>
            </View>
          </View>
        </View>

        {/* Recent */}
        <Text className="mt-7 text-lg font-bold text-gray-900">
          Recent earnings
        </Text>

        <View className="mt-3 overflow-hidden rounded-2xl bg-white">
          {[
            ["#AH-10482", "Today · 10:42 AM", "+SAR 9.50"],
            ["#AH-10476", "Today · 09:18 AM", "+SAR 8.00"],
            ["#AH-10472", "Yesterday · 07:36 PM", "+SAR 11.00"],
          ].map(([id, date, amount], index) => (
            <View
              key={id}
              className={`flex-row items-center justify-between p-4 ${
                index !== 2 ? "border-b border-gray-100" : ""
              }`}
            >
              <View>
                <Text className="font-semibold text-gray-800">
                  {id}
                </Text>

                <Text className="mt-1 text-xs text-gray-400">
                  {date}
                </Text>
              </View>

              <Text className="font-bold text-green-600">
                {amount}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}