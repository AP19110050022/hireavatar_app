import Ionicons from "@react-native-vector-icons/ionicons";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import { Platform } from "react-native";

import { usesNativeTabs } from "@/src/navigation";
import { colors } from "@/src/theme";

const TABS = [
  { name: "browse", label: "Browse", sf: "square.grid.2x2.fill", icon: "grid" },
  { name: "offers", label: "Offers", sf: "tray.full.fill", icon: "file-tray-full" },
  { name: "messages", label: "Messages", sf: "bubble.left.and.bubble.right.fill", icon: "chatbubbles" },
  { name: "profile", label: "Profile", sf: "person.crop.circle.fill", icon: "person-circle" },
] as const;

export default function TabsLayout() {
  if (usesNativeTabs) {
    return (
      <NativeTabs tintColor={colors.onSurface}>
        {TABS.map((t) => (
          <NativeTabs.Trigger key={t.name} name={t.name}>
            <NativeTabs.Trigger.Icon sf={t.sf as any} />
            <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.onSurface,
        tabBarInactiveTintColor: colors.subtle,
        tabBarStyle: {
          backgroundColor: colors.surfaceElevated,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
        sceneStyle: { backgroundColor: colors.surface },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.label,
            tabBarButtonTestID: `tab-${t.name}`,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={(focused ? t.icon : `${t.icon}-outline`) as any} size={24} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
