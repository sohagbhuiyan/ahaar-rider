import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20 }}
      >
        <Text className="text-2xl font-bold text-gray-900">Profile</Text>

        {/* Profile */}
        <View className="mt-6 items-center rounded-2xl bg-white p-6">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-pink-50">
            <Text className="text-3xl font-bold text-[#FF2B85]">S</Text>
          </View>

          <Text className="mt-3 text-lg font-bold text-gray-900">
            Sohag Rider
          </Text>

          <Text className="mt-1 text-sm text-gray-500">
            AHAAR Delivery Partner
          </Text>
        </View>

        {/* Menu */}
        <View className="mt-4 overflow-hidden rounded-2xl bg-white">
          {[
            "Personal Information",
            "Vehicle Information",
            "Documents",
            "Payout Information",
            "Notifications",
            "Help & Support",
          ].map((item, index) => (
            <Pressable
              key={item}
              className={`flex-row items-center px-4 py-4 ${
                index !== 5 ? "border-b border-gray-100" : ""
              }`}
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-50">
                <Text className="text-gray-500">•</Text>
              </View>

              <Text className="ml-3 flex-1 font-medium text-gray-800">
                {item}
              </Text>

              <Text className="text-xl text-gray-400">›</Text>
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <Pressable className="mt-4 items-center rounded-xl bg-white py-4">
          <Text className="font-bold text-red-500">LOG OUT</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
