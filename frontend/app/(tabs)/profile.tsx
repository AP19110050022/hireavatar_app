import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { imgUrl } from "@/src/api";
import { useAppAuth } from "@/src/auth";
import { Button, PressScale } from "@/src/components/ui";
import { usesNativeTabs } from "@/src/navigation";
import { colors, radius, spacing } from "@/src/theme";

function ProfileRow({ icon, label, onPress, testID }: { icon: string; label: string; onPress: () => void; testID: string }) {
  return (
    <PressScale onPress={onPress} style={styles.row} testID={testID}>
      <Ionicons name={icon as any} size={22} color={colors.onSurface} />
      <Text style={styles.rowText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
    </PressScale>
  );
}

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { me, signOut } = useAppAuth();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const isPresenter = me?.role === "presenter";
  const display = me?.role === "business" ? me.business_name || me.name : me?.name;

  return (
    <View style={styles.root} testID="profile-screen">
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: bottomChrome + spacing.xl }}>
        <Text style={styles.h1}>Profile</Text>
        <View style={styles.card}>
          {me?.picture ? <Image source={imgUrl(me.picture)} style={styles.avatar} contentFit="cover" /> : (
            <View style={[styles.avatar, styles.initial]}><Text style={styles.initialText}>{(display || "?").charAt(0).toUpperCase()}</Text></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name} testID="profile-name">{display || "Your account"}</Text>
            <Text style={styles.email} numberOfLines={1} testID="profile-email">{me?.email}</Text>
            <View style={styles.rolePill}><Text style={styles.roleText} testID="profile-role">{isPresenter ? "Presenter" : "Business"}</Text></View>
          </View>
        </View>

        <View style={styles.group}>
          {isPresenter ? <ProfileRow icon="create-outline" label="Edit profile, photos & prices" onPress={() => router.push("/edit-profile")} testID="profile-edit-button" /> : null}
          {isPresenter ? <ProfileRow icon="eye-outline" label="See my public profile" onPress={() => router.push("/browse")} testID="profile-public-button" /> : null}
          {!isPresenter ? <ProfileRow icon="grid-outline" label="Browse presenters" onPress={() => router.push("/browse")} testID="profile-browse-button" /> : null}
          <ProfileRow icon="file-tray-full-outline" label="My offers" onPress={() => router.push("/offers")} testID="profile-offers-button" />
          <ProfileRow icon="globe-outline" label="Open hireavatar.co" onPress={() => WebBrowser.openBrowserAsync("https://www.hireavatar.co")} testID="profile-website-button" />
        </View>

        <Button title="Sign out" variant="danger" onPress={signOut} style={{ marginTop: spacing.xl }} testID="profile-sign-out-button" />
        <Text style={styles.foot}>© 2026 HireAvatar</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  h1: { color: colors.onSurface, fontSize: 32, fontWeight: "800", letterSpacing: -0.5, marginBottom: spacing.lg },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceTertiary },
  initial: { alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary },
  initialText: { color: colors.onBrandTertiary, fontSize: 26, fontWeight: "800" },
  name: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  email: { color: colors.muted, fontSize: 13, marginTop: 2 },
  rolePill: { alignSelf: "flex-start", marginTop: spacing.sm, backgroundColor: colors.brand, borderRadius: radius.pill, paddingHorizontal: 10, height: 24, justifyContent: "center" },
  roleText: { color: colors.onBrand, fontWeight: "800", fontSize: 11 },
  group: { marginTop: spacing.xl, borderRadius: radius.lg, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, height: 56, borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowText: { color: colors.onSurface, fontSize: 15, fontWeight: "600", flex: 1 },
  foot: { color: colors.subtle, fontSize: 12, textAlign: "center", marginTop: spacing.xl },
});
