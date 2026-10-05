import { Tabs } from "expo-router";
import FloatingTabBar from "../../components/FloatingTabBar";
import EarningsIcon from "../../components/icons/EarningsIcon";
import HomeIcon from "../../components/icons/HomeIcon";
import OrdersIcon from "../../components/icons/OrdersIcon";
import ProfileIcon from "../../components/icons/ProfileIcon";
import { navTint } from "../../lib/theme";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
        animation: "shift",
        tabBarActiveTintColor: navTint.active,
        tabBarInactiveTintColor: navTint.inactive,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <HomeIcon color={color} filled={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <OrdersIcon color={color} filled={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color, focused }) => (
            <EarningsIcon color={color} filled={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <ProfileIcon color={color} filled={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
