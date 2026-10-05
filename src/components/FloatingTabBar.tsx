import { useActiveOrderCount } from "@/lib/store";
import { colors, navTint } from "@/lib/theme";
import React, { useEffect, useState } from "react";
import { Animated, Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACTIVE_COLOR = navTint.active;
const INACTIVE_COLOR = navTint.inactive;
const TAB_BAR_HEIGHT = 58;

type NavigationState = {
  index: number;
  routes: { key: string; name: string }[];
};

type NavigationHelpers = {
  emit: (event: {
    type: string;
    target?: string;
    canPreventDefault?: boolean;
  }) => {
    defaultPrevented: boolean;
  };
  navigate: (name: string) => void;
};

type DescriptorOptions = {
  title?: string;
  tabBarLabel?:
    | string
    | ((props: { focused: boolean; color: string }) => React.ReactNode);
  tabBarIcon?: (props: {
    focused: boolean;
    color: string;
    size: number;
  }) => React.ReactNode;
};

type RouteDescriptors = Record<string, { options: DescriptorOptions }>;

interface FloatingTabBarProps {
  state: NavigationState;
  descriptors: RouteDescriptors;
  navigation: NavigationHelpers;
}

interface TabItemProps {
  isFocused: boolean;
  label: string;
  icon: (props: { color: string; filled: boolean }) => React.ReactNode;
  onPress: () => void;
  onLongPress: () => void;
  badge?: number;
}

function TabItem({
  isFocused,
  label,
  icon,
  onPress,
  onLongPress,
  badge = 0,
}: TabItemProps) {
  // Lazy useState init: one Animated.Value per tab, React Compiler friendly.
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [labelOpacity] = useState(() => new Animated.Value(isFocused ? 1 : 0));
  const [pillScale] = useState(() => new Animated.Value(isFocused ? 1 : 0));
  const [iconTranslate] = useState(
    () => new Animated.Value(isFocused ? -2 : 0),
  );

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.06 : 1,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }),
      Animated.timing(labelOpacity, {
        toValue: isFocused ? 1 : 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.spring(pillScale, {
        toValue: isFocused ? 1 : 0,
        useNativeDriver: true,
        tension: 160,
        friction: 12,
      }),
      Animated.spring(iconTranslate, {
        toValue: isFocused ? -2 : 0,
        useNativeDriver: true,
        tension: 180,
        friction: 12,
      }),
    ]).start();
  }, [isFocused, scaleAnim, labelOpacity, pillScale, iconTranslate]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.88,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.06 : 1,
      useNativeDriver: true,
      tension: 160,
      friction: 10,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      style={{
        flex: 1,
        height: TAB_BAR_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          width: 52,
          height: 52,
          borderRadius: 14,
          backgroundColor: colors.brand[50],
          transform: [{ scale: pillScale }],
        }}
      />

      <Animated.View
        style={{ alignItems: "center", transform: [{ scale: scaleAnim }] }}
      >
        <Animated.View style={{ transform: [{ translateY: iconTranslate }] }}>
          {icon({
            color: isFocused ? ACTIVE_COLOR : INACTIVE_COLOR,
            filled: isFocused,
          })}

          {badge > 0 && (
            <View
              accessibilityLabel={`${badge} active orders`}
              style={{
                position: "absolute",
                top: -6,
                right: -10,
                minWidth: 16,
                height: 16,
                paddingHorizontal: 4,
                borderRadius: 8,
                backgroundColor: ACTIVE_COLOR,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1.5,
                borderColor: "#ffffff",
              }}
            >
              <Text
                style={{ color: "#ffffff", fontSize: 9, fontWeight: "700" }}
              >
                {badge > 9 ? "9+" : badge}
              </Text>
            </View>
          )}
        </Animated.View>

        <Animated.Text
          style={{
            fontSize: 10,
            fontWeight: "600",
            letterSpacing: 0.2,
            color: ACTIVE_COLOR,
            marginTop: 1,
            opacity: labelOpacity,
          }}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeOrderCount = useActiveOrderCount();

  return (
    <View
      style={{
        width: "100%",
        height: TAB_BAR_HEIGHT + insets.bottom,
        backgroundColor: colors.surface.DEFAULT,
        flexDirection: "row",
        alignItems: "flex-start",
        borderTopWidth: 1,
        borderTopColor: colors.border.DEFAULT,
        ...Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
          },
          android: { elevation: 16 },
        }),
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === "string"
            ? options.tabBarLabel
            : typeof options.title === "string"
              ? options.title
              : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented)
            navigation.navigate(route.name);
        };

        const onLongPress = () => {
          navigation.emit({ type: "tabLongPress", target: route.key });
        };

        const iconRenderer = (props: { color: string; filled: boolean }) =>
          options.tabBarIcon
            ? (options.tabBarIcon({
                ...props,
                size: 24,
                focused: props.filled,
              }) as React.ReactNode)
            : null;

        return (
          <TabItem
            key={route.key}
            isFocused={isFocused}
            label={label}
            icon={iconRenderer}
            onPress={onPress}
            onLongPress={onLongPress}
            badge={route.name === "orders" ? activeOrderCount : 0}
          />
        );
      })}
    </View>
  );
}
