import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        <View className="px-5 pt-5">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-gray-500">Good morning</Text>
              <Text className="mt-1 text-2xl font-bold text-gray-900">
                AHAAR Rider
              </Text>
            </View>

            <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
              <Text className="text-lg">🔔</Text>
            </View>
          </View>

          {/* Online Status */}
          <View className="mt-6 rounded-2xl bg-white p-5">
            <View className="flex-row items-center">
              <View className="mr-2 h-3 w-3 rounded-full bg-gray-400" />
              <Text className="font-semibold text-gray-800">
                You're offline
              </Text>
            </View>

            <Pressable className="mt-4 items-center rounded-xl bg-[#FF2B85] py-3.5">
              <Text className="font-bold text-white">GO ONLINE</Text>
            </Pressable>
          </View>

          {/* Stats */}
          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-white p-4">
              <Text className="text-sm text-gray-500">Deliveries</Text>
              <Text className="mt-2 text-2xl font-bold text-gray-900">8</Text>
            </View>

            <View className="flex-1 rounded-2xl bg-white p-4">
              <Text className="text-sm text-gray-500">Today</Text>
              <Text className="mt-2 text-2xl font-bold text-gray-900">
                SAR 72
              </Text>
            </View>
          </View>

          {/* Active Delivery */}
          <Text className="mt-7 text-lg font-bold text-gray-900">
            Active delivery
          </Text>

          <View className="mt-3 rounded-2xl bg-white p-5">
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-gray-900">#AH-10482</Text>

              <View className="rounded-full bg-pink-50 px-3 py-1">
                <Text className="text-xs font-semibold text-[#FF2B85]">
                  Ready
                </Text>
              </View>
            </View>

            <View className="mt-5">
              <Text className="text-xs font-semibold text-gray-400">
                PICKUP
              </Text>

              <Text className="mt-1 font-semibold text-gray-800">
                AHAAR Kitchen
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Al Olaya, Riyadh
              </Text>
            </View>

            <View className="my-4 h-px bg-gray-100" />

            <View>
              <Text className="text-xs font-semibold text-gray-400">
                DROP-OFF
              </Text>

              <Text className="mt-1 font-semibold text-gray-800">
                Customer Address
              </Text>

              <Text className="mt-1 text-sm text-gray-500">
                Al Malaz, Riyadh
              </Text>
            </View>

            <Pressable className="mt-5 items-center rounded-xl bg-gray-900 py-3.5">
              <Text className="font-bold text-white">VIEW DELIVERY</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
