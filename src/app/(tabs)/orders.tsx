import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const activeDeliveries = [
  {
    id: "AH-10482",
    restaurant: "Juniper Kitchen",
    pickup: "King Fahd Road",
    location: "Al Wurud, Building 18",
    status: "At restaurant",
    earning: "SAR 9.50",
    time: "Pickup ready · 10:42 AM",
  },
];

const completedDeliveries = [
  {
    id: "AH-10476",
    restaurant: "Saffron Table",
    pickup: "Tahlia Street",
    location: "Al Olaya, Riyadh",
    status: "Completed",
    earning: "SAR 18.00",
    time: "Today · 09:18 AM",
  },
  {
    id: "AH-10472",
    restaurant: "Daily Dose Cafe",
    pickup: "Al Urubah Road",
    location: "Al Wurud, Riyadh",
    status: "Completed",
    earning: "SAR 21.00",
    time: "Today · 08:34 AM",
  },
  {
    id: "AH-10461",
    restaurant: "Misk Bakery",
    pickup: "King Abdulaziz Road",
    location: "Al Mohammadiyah, Riyadh",
    status: "Completed",
    earning: "SAR 16.50",
    time: "Yesterday · 07:36 PM",
  },
];

export default function OrdersScreen() {
  const [filter, setFilter] = useState<"Active" | "Completed">("Active");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const deliveries =
    filter === "Active" ? activeDeliveries : completedDeliveries;

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
          YOUR SHIFT
        </Text>
        <Text className="mt-1 text-[28px] font-extrabold text-[#17251b]">
          Orders
        </Text>
        <Text className="mt-1 text-sm text-[#68756b]">
          Every pickup, all in one place.
        </Text>

        <View className="mt-6 flex-row border-b border-[#dce4dc]">
          {(["Active", "Completed"] as const).map((item) => (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === item }}
              onPress={() => {
                setFilter(item);
                setExpandedOrder(null);
              }}
              className={`mr-7 border-b-2 px-1 pb-3 ${filter === item ? "border-[#24613f]" : "border-transparent"}`}
            >
              <Text
                className={`text-sm font-bold ${filter === item ? "text-[#24613f]" : "text-[#89918a]"}`}
              >
                {item} {item === "Active" ? "1" : "12"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase tracking-[1.3px] text-[#68756b]">
            {filter === "Active" ? "ON THE ROAD" : "RECENT DELIVERIES"}
          </Text>
          <Text className="text-xs text-[#89918a]">Riyadh · Today</Text>
        </View>

        <View className="mt-3">
          {deliveries.map((delivery, index) => {
            const isExpanded = expandedOrder === delivery.id;
            return (
              <Pressable
                key={delivery.id}
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
                onPress={() =>
                  setExpandedOrder(isExpanded ? null : delivery.id)
                }
                className="mb-3 border border-[#e1e6de] bg-white p-4"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-bold uppercase tracking-[1px] text-[#68756b]">
                    {delivery.id}
                  </Text>
                  <View
                    className={`rounded-[3px] px-2 py-1 ${filter === "Active" ? "bg-[#fff0e6]" : "bg-[#eaf3ed]"}`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase tracking-[0.5px] ${filter === "Active" ? "text-[#a65329]" : "text-[#24613f]"}`}
                    >
                      {delivery.status}
                    </Text>
                  </View>
                </View>

                <Text className="mt-3 text-base font-bold text-[#17251b]">
                  {delivery.restaurant}
                </Text>
                <View className="mt-3 flex-row">
                  <View className="mr-3 items-center">
                    <View className="mt-1 h-2 w-2 rounded-full bg-[#347650]" />
                    <View className="my-1 h-5 w-px bg-[#dce4dc]" />
                    <View className="h-2 w-2 rounded-full bg-[#e27742]" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-[#68756b]">PICKUP</Text>
                    <Text className="mt-0.5 text-sm font-medium text-[#17251b]">
                      {delivery.pickup}
                    </Text>
                    <Text className="mt-2 text-xs text-[#68756b]">
                      DROP-OFF
                    </Text>
                    <Text className="mt-0.5 text-sm font-medium text-[#17251b]">
                      {delivery.location}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row items-center justify-between border-t border-[#edf0eb] pt-3">
                  <Text className="text-xs text-[#68756b]">
                    {delivery.time}
                  </Text>
                  <Text className="text-sm font-bold text-[#24613f]">
                    {delivery.earning}
                  </Text>
                </View>

                {isExpanded && (
                  <View className="mt-3 border-t border-[#edf0eb] pt-3">
                    <Text className="text-xs leading-5 text-[#68756b]">
                      {filter === "Active"
                        ? "Head to the pickup counter. The order is packed and ready to collect."
                        : `Delivered safely. Your ${index === 0 ? "on-time" : "completed"} delivery has been added to today's earnings.`}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {filter === "Active" && (
          <View className="mt-2 border-t border-[#dce4dc] pt-4">
            <Text className="text-xs leading-5 text-[#89918a]">
              New requests will appear here while your shift is online.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
