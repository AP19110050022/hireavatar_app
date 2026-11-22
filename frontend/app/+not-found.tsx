import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/src/components/ui";
import { colors, spacing } from "@/src/theme";

export default function NotFoundScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="not-found-screen">
      <Ionicons name="compass-outline" size={52} color={colors.brand} />
      <Text style={styles.title}>This page isn’t here</Text>
      <Text style={styles.body}>Let’s get you back to the HireAvatar marketplace.</Text>
      <Button title="Go to HireAvatar" onPress={() => router.replace("/")} testID="not-found-home-button" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", alignItems: "stretch", backgroundColor: colors.surface, paddingHorizontal: spacing.xl, gap: spacing.md },
  title: { color: colors.onSurface, fontSize: 26, fontWeight: "800", textAlign: "center" },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: spacing.md },
});