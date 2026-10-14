import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const profileItems = [
    { title: "Personal details", detail: "Name, phone and email", mark: "01" },
    {
      title: "Vehicle & documents",
      detail: "Motorcycle · Valid through 2027",
      mark: "02",
    },
    { title: "Payout account", detail: "Al Rajhi Bank ···· 2841", mark: "03" },
    {
      title: "Help & support",
      detail: "Rider care is available 24/7",
      mark: "04",
    },
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
          RIDER ACCOUNT
        </Text>
        <Text className="mt-1 text-[28px] font-extrabold text-[#17251b]">
          Profile
        </Text>

        <View className="mt-5 overflow-hidden rounded-[6px] bg-[#1c4e33] p-5">
          <View className="flex-row items-center">
            <View className="h-[62px] w-[62px] items-center justify-center rounded-full border border-[#6e927a] bg-[#2c6442]">
              <Text className="text-lg font-extrabold text-white">SK</Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-xl font-extrabold text-white">
                Sami Khalid
              </Text>
              <Text className="mt-1 text-sm text-[#c0d4c5]">
                AHAAR delivery partner
              </Text>
            </View>
            <View className="rounded-[3px] border border-[#6e927a] px-2 py-1">
              <Text className="text-[9px] font-bold uppercase tracking-[1px] text-[#d9e8dd]">
                ACTIVE
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row border-t border-[#406a4e] pt-4">
            <View className="flex-1">
              <Text className="text-[10px] font-semibold uppercase tracking-[1px] text-[#c0d4c5]">
                RIDER ID
              </Text>
              <Text className="mt-1 text-sm font-bold text-white">
                AR-20841
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-semibold uppercase tracking-[1px] text-[#c0d4c5]">
                ON AHAAR SINCE
              </Text>
              <Text className="mt-1 text-sm font-bold text-white">
                March 2024
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-6 flex-row items-end justify-between">
          <Text className="text-base font-extrabold text-[#17251b]">
            Account details
          </Text>
          <Text className="text-xs text-[#89918a]">PROFILE 92% COMPLETE</Text>
        </View>

        <View className="mt-3 border-y border-[#e1e6de] bg-white">
          {profileItems.map((item, index) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityState={{ expanded: selectedItem === item.title }}
              onPress={() =>
                setSelectedItem(selectedItem === item.title ? null : item.title)
              }
              className={`flex-row items-center px-3 py-4 ${index < profileItems.length - 1 ? "border-b border-[#edf0eb]" : ""}`}
            >
              <View className="h-9 w-9 items-center justify-center border border-[#e1e6de] bg-[#f4f6f1]">
                <Text className="text-[10px] font-bold text-[#24613f]">
                  {item.mark}
                </Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-bold text-[#17251b]">
                  {item.title}
                </Text>
                <Text className="mt-1 text-xs text-[#89918a]">
                  {item.detail}
                </Text>
                {selectedItem === item.title && (
                  <Text className="mt-2 text-xs leading-5 text-[#24613f]">
                    {item.title === "Help & support"
                      ? "Rider care can help with an order, account or payout."
                      : "Your verified rider information is up to date."}
                  </Text>
                )}
              </View>
              <Text className="ml-2 text-base font-medium text-[#89918a]">
                {selectedItem === item.title ? "−" : "+"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-6 border-t border-[#dce4dc] pt-4">
          <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-[#68756b]">
            SHIFT SUMMARY
          </Text>
          <View className="mt-3 flex-row justify-between">
            <View>
              <Text className="text-xl font-extrabold text-[#17251b]">
                4.98
              </Text>
              <Text className="mt-1 text-xs text-[#68756b]">Rider rating</Text>
            </View>
            <View>
              <Text className="text-xl font-extrabold text-[#17251b]">98%</Text>
              <Text className="mt-1 text-xs text-[#68756b]">Acceptance</Text>
            </View>
            <View>
              <Text className="text-xl font-extrabold text-[#17251b]">
                1,284
              </Text>
              <Text className="mt-1 text-xs text-[#68756b]">Deliveries</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
