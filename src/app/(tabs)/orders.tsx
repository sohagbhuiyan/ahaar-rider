import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const deliveries = [
  {
    id: "AH-10482",
    location: "Al Malaz, Riyadh",
    status: "Ready",
    earning: "SAR 9.50",
  },
  {
    id: "AH-10476",
    location: "Al Olaya, Riyadh",
    status: "Completed",
    earning: "SAR 8.00",
  },
  {
    id: "AH-10472",
    location: "Al Wurud, Riyadh",
    status: "Completed",
    earning: "SAR 11.00",
  },
];

export default function OrdersScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20 }}
      >
        <Text className="text-2xl font-bold text-gray-900">Orders</Text>

        <Text className="mt-1 text-sm text-gray-500">
          Your delivery history
        </Text>

        {/* Filter */}
        <View className="mt-5 flex-row rounded-xl bg-gray-200 p-1">
          <Pressable className="flex-1 items-center rounded-lg bg-white py-2.5">
            <Text className="font-semibold text-gray-900">Active</Text>
          </Pressable>

          <Pressable className="flex-1 items-center py-2.5">
            <Text className="font-semibold text-gray-500">Completed</Text>
          </Pressable>
        </View>

        {/* List */}
        <View className="mt-4 gap-3">
          {deliveries.map((delivery) => (
            <Pressable key={delivery.id} className="rounded-2xl bg-white p-4">
              <View className="flex-row items-center justify-between">
                <Text className="font-bold text-gray-900">#{delivery.id}</Text>

                <Text className="text-xs font-semibold text-gray-500">
                  {delivery.status}
                </Text>
              </View>

              <Text className="mt-4 text-xs font-semibold text-gray-400">
                DROP-OFF
              </Text>

              <Text className="mt-1 font-semibold text-gray-800">
                {delivery.location}
              </Text>

              <View className="mt-4 flex-row justify-between border-t border-gray-100 pt-3">
                <Text className="text-sm text-gray-500">Earning</Text>

                <Text className="font-bold text-gray-900">
                  {delivery.earning}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
