import { Stack } from "expo-router";
import "./global.css";
function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "ios_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
export default RootLayout;
