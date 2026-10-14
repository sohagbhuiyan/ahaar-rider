import { setRiderOnline, useRiderDemo } from "@/lib/store";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";

export default function HomeScreen() {
  const { isOnline } = useRiderDemo();
  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <SafeAreaView className="flex-1 bg-[#f4f6f1]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <View className="px-5 pt-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-[#68756b]">
                {dateLabel}
              </Text>
              <Text className="mt-1 text-[27px] font-extrabold text-[#17251b]">
                Good morning, Sami
              </Text>
            </View>
            <View className="ml-3 h-11 w-11 items-center justify-center rounded-full border border-[#dce4dc] bg-white">
              <Text className="text-sm font-bold text-[#24613f]">SK</Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-center justify-between border-y border-[#dce4dc] py-3.5">
            <View className="flex-row items-center">
              <View
                className={`mr-2.5 h-2.5 w-2.5 rounded-full ${isOnline ? "bg-[#3b9a64]" : "bg-[#9ba39a]"}`}
              />
              <View>
                <Text className="text-sm font-bold text-[#17251b]">
                  {isOnline ? "You're online" : "You're offline"}
                </Text>
                <Text className="mt-0.5 text-xs text-[#68756b]">
                  {isOnline
                    ? "Taking orders in Al Olaya"
                    : "Go online to receive orders"}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: isOnline }}
              onPress={() => setRiderOnline(!isOnline)}
              className={`min-w-[92px] items-center rounded-[5px] px-4 py-2.5 ${isOnline ? "bg-[#eaf3ed]" : "bg-[#24613f]"}`}
            >
              <Text
                className={`text-xs font-extrabold uppercase tracking-[1px] ${isOnline ? "text-[#24613f]" : "text-white"}`}
              >
                {isOnline ? "End shift" : "Go online"}
              </Text>
            </Pressable>
          </View>

          <View className="mt-5 flex-row items-end justify-between">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-[1.3px] text-[#68756b]">
                Today's earnings
              </Text>
              <Text className="mt-1 text-[30px] font-extrabold text-[#17251b]">
                SAR 146<Text className="text-xl">.50</Text>
              </Text>
            </View>
            <View className="items-end pb-1">
              <Text className="text-lg font-bold text-[#17251b]">6</Text>
              <Text className="text-xs text-[#68756b]">deliveries</Text>
            </View>
          </View>

          <View className="mt-5 overflow-hidden rounded-[6px] border border-[#dce4dc] bg-[#e8eee4]">
            <View className="flex-row items-center justify-between px-4 py-3">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#68756b]">
                  Your zone
                </Text>
                <Text className="mt-0.5 text-base font-bold text-[#17251b]">
                  Al Olaya, Riyadh
                </Text>
              </View>
              <Text className="text-xs font-semibold text-[#24613f]">
                LIVE AREA
              </Text>
            </View>
            <View className="h-[180px] overflow-hidden border-t border-[#d6e0d4]">
              <Svg
                width="100%"
                height="100%"
                viewBox="0 0 400 180"
                preserveAspectRatio="xMidYMid slice"
              >
                <Path
                  d="M-10 32 H410 M-10 80 H410 M-10 130 H410 M45 -10 V190 M118 -10 V190 M205 -10 V190 M292 -10 V190 M365 -10 V190"
                  stroke="#d3ded0"
                  strokeWidth="10"
                />
                <Path
                  d="M-10 32 H410 M-10 80 H410 M-10 130 H410 M45 -10 V190 M118 -10 V190 M205 -10 V190 M292 -10 V190 M365 -10 V190"
                  stroke="#f8faf5"
                  strokeWidth="6"
                />
                <Path
                  d="M37 158 C80 145 77 88 133 89 S175 123 216 111 S262 43 316 52"
                  fill="none"
                  stroke="#347650"
                  strokeWidth="4"
                  strokeDasharray="7 5"
                />
                <Circle cx="37" cy="158" r="10" fill="#347650" />
                <Circle cx="37" cy="158" r="4" fill="#ffffff" />
                <Circle cx="316" cy="52" r="11" fill="#e27742" />
                <Circle cx="316" cy="52" r="4" fill="#ffffff" />
                <SvgText
                  x="145"
                  y="24"
                  fill="#738274"
                  fontSize="9"
                  fontWeight="700"
                  letterSpacing="1.5"
                >
                  KING FAHD RD
                </SvgText>
                <SvgText
                  x="227"
                  y="151"
                  fill="#738274"
                  fontSize="9"
                  fontWeight="700"
                  letterSpacing="1.5"
                >
                  AL OLAYA ST
                </SvgText>
                <SvgText
                  x="50"
                  y="117"
                  fill="#667568"
                  fontSize="9"
                  fontWeight="600"
                >
                  Al Faisaliah
                </SvgText>
              </Svg>
            </View>
            <View className="flex-row items-center justify-between bg-white px-4 py-2.5">
              <Text className="text-xs text-[#68756b]">
                6 min to restaurant
              </Text>
              <Text className="text-xs font-bold text-[#24613f]">
                2.4 km route
              </Text>
            </View>
          </View>

          <View className="mt-6 flex-row items-center justify-between">
            <Text className="text-lg font-extrabold text-[#17251b]">
              Active delivery
            </Text>
            <Text className="text-xs font-semibold text-[#68756b]">
              1 ORDER
            </Text>
          </View>

          <View className="mt-3 border-l-[3px] border-[#e27742] bg-white p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-[#68756b]">
                  ORDER AH-10482
                </Text>
                <Text className="mt-1 text-lg font-bold text-[#17251b]">
                  Pickup is ready
                </Text>
              </View>
              <Text className="text-sm font-bold text-[#24613f]">
                SAR 24.50
              </Text>
            </View>

            <View className="mt-4 flex-row">
              <View className="mr-3 items-center">
                <View className="mt-1 h-2.5 w-2.5 rounded-full border-2 border-[#347650] bg-white" />
                <View className="my-1 h-7 w-px bg-[#dce4dc]" />
                <View className="h-2.5 w-2.5 rounded-full bg-[#e27742]" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-[#17251b]">
                  Juniper Kitchen
                </Text>
                <Text className="mt-0.5 text-xs text-[#68756b]">
                  King Fahd Road · pickup counter
                </Text>
                <Text className="mt-3 text-sm font-semibold text-[#17251b]">
                  Noura A.
                </Text>
                <Text className="mt-0.5 text-xs text-[#68756b]">
                  Al Wurud · Building 18, Apt 4
                </Text>
              </View>
            </View>

            <Pressable className="mt-4 flex-row items-center justify-center rounded-[5px] bg-[#1c4e33] py-3.5">
              <Text className="text-sm font-bold uppercase tracking-[1px] text-white">
                Navigate to pickup
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
