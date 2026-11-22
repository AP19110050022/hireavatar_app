import Ionicons from "@react-native-vector-icons/ionicons";
import React, { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BASE, Role } from "@/src/api";
import { useAppAuth } from "@/src/auth";
import { Backdrop, Button, GradientTile, Logo, PressScale, useToast } from "@/src/components/ui";
import { colors, radius, spacing } from "@/src/theme";

export default function RoleScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { signOut, me, retry } = useAppAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!role) return;
    setBusy(true);
    try {
      await Linking.openURL(`${BASE}/app`);
    } catch (e: any) {
      toast(e.message || "Couldn’t open HireAvatar setup", "error");
    } finally {
      setBusy(false);
    }
  };

  const Option = ({ value, title, body, icon, from, to }: { value: Role; title: string; body: string; icon: string; from: string; to: string }) => {
    const on = role === value;
    return (
      <PressScale onPress={() => setRole(value)} style={[styles.opt, on ? styles.optOn : null]} testID={`role-option-${value}`}>
        <GradientTile icon={icon} from={from} to={to} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={styles.optTitle}>{title}</Text>
          <Text style={styles.optBody}>{body}</Text>
        </View>
        <Ionicons name={on ? "checkmark-circle" : "ellipse-outline"} size={26} color={on ? colors.onSurface : colors.subtle} />
      </PressScale>
    );
  };

  return (
    <View style={styles.root} testID="role-screen">
      <Backdrop />
      <KeyboardAwareScrollView bottomOffset={120} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        <Logo size={24} />
        <Text style={styles.h1}>Hi{me?.name ? ` ${me.name.split(" ")[0]}` : ""}, how will you use HireAvatar?</Text>
        <Text style={styles.sub}>Set up your profile securely on HireAvatar, then return here to use the same data.</Text>
        <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
          <Option value="presenter" title="I'm a presenter" body="Set your prices and get hired by brands." icon="play" from={colors.gradViolet} to={colors.gradPink} />
          <Option value="business" title="I'm a business" body="Find on-camera talent and send offers." icon="storefront-outline" from={colors.gradBlue} to={colors.gradViolet} />
        </View>
      </KeyboardAwareScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button title="Complete setup on HireAvatar" onPress={save} loading={busy} disabled={!role} testID="role-continue-button" />
        <Button title="I’ve finished setup — refresh" variant="glass" onPress={retry} testID="role-refresh-button" />
        <PressScale onPress={signOut} style={styles.link} testID="role-sign-out-button">
          <Text style={styles.linkText}>Sign out</Text>
        </PressScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  h1: { color: colors.onSurface, fontSize: 30, lineHeight: 34, fontWeight: "800", marginTop: spacing.xxl, letterSpacing: -0.5 },
  sub: { color: colors.muted, fontSize: 15, marginTop: spacing.sm },
  opt: { flexDirection: "row", alignItems: "center", gap: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceTertiary, borderWidth: 1.5, borderColor: colors.border },
  optOn: { borderColor: colors.onSurface, backgroundColor: colors.surfaceSecondary },
  optTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  optBody: { color: colors.muted, fontSize: 14, marginTop: 2, lineHeight: 19 },
  input: { marginTop: spacing.lg, height: 54, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.borderStrong, color: colors.onSurface, paddingHorizontal: spacing.lg, fontSize: 16 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  link: { alignSelf: "center", padding: spacing.md },
  linkText: { color: colors.muted, fontWeight: "700" },
});
