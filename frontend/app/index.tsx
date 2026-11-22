import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { imgUrl, PLANS, Presenter, request, rupees } from "@/src/api";
import { useAppAuth } from "@/src/auth";
import { Backdrop, Button, GradientTile, Logo, PressScale } from "@/src/components/ui";
import { colors, radius, spacing } from "@/src/theme";

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { configured } = useAppAuth();
  const { data } = useQuery({ queryKey: ["presenters-strip"], queryFn: () => request<Presenter[]>("/presenters?limit=10", null) });
  const goSignIn = () => router.push("/sign-in");

  return (
    <View style={styles.root} testID="welcome-screen">
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Logo size={26} testID="brand-logo" />
          <PressScale onPress={goSignIn} style={styles.login} testID="welcome-login-button">
            <Text style={styles.loginText}>Log in</Text>
          </PressScale>
        </View>

        <Animated.Text entering={FadeInDown.duration(500)} style={styles.h1}>Be the face of a brand.{"\n"}Or find yours.</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(80).duration(500)} style={styles.sub}>
          Presenters get hired to promote. Businesses find on-camera talent in minutes.
        </Animated.Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} testID="welcome-presenter-strip">
          {(data ?? []).filter((p) => p.photos.length > 0).map((p, i) => (
            <Animated.View key={p.user_id} entering={FadeInDown.delay(120 + i * 60).duration(450)}>
              <PressScale onPress={goSignIn} style={styles.stripCard}>
                <Image source={imgUrl(p.photos[0])} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
                <LinearGradient colors={[colors.scrimClear, colors.scrimClear, colors.scrim]} style={StyleSheet.absoluteFill} />
                <View style={styles.stripInfo}>
                  <View style={styles.row}>
                    <Text style={styles.stripName} numberOfLines={1}>{p.name}</Text>
                    <View style={styles.dot} />
                  </View>
                  <View style={styles.price}><Text style={styles.priceText}>from {rupees(p.price_per_video)}</Text></View>
                </View>
              </PressScale>
            </Animated.View>
          ))}
        </ScrollView>

        <View style={styles.pad}>
          <Button title="Create account" onPress={goSignIn} testID="welcome-signup-button" />
          <Button title="I already have an account" variant="glass" onPress={goSignIn} testID="welcome-signin-button" style={{ marginTop: spacing.md }} />
          <Text style={styles.note}>
            {configured ? "Continue with Google or email. Choose presenter or business after you sign in." : "Sign-in is being set up. Browse the presenters above in the meantime."}
          </Text>

          <View style={styles.sides}>
            <View style={styles.side} testID="welcome-side-presenters">
              <GradientTile icon="play" from={colors.gradViolet} to={colors.gradPink} />
              <Text style={styles.sideTitle}>Presenters</Text>
              <Text style={styles.sideBody}>Join free, set your own prices, and receive business offers.</Text>
            </View>
            <View style={styles.side} testID="welcome-side-businesses">
              <GradientTile icon="storefront-outline" from={colors.gradBlue} to={colors.gradViolet} />
              <Text style={styles.sideTitle}>Businesses</Text>
              <Text style={styles.sideBody}>Message presenters and send offers.</Text>
            </View>
          </View>

          <Text style={styles.section}>Three simple ways to hire</Text>
          {PLANS.map((p) => (
            <PressScale key={p.key} onPress={goSignIn} style={styles.plan} testID={`welcome-plan-${p.key}`}>
              <View style={styles.planIcon}><Ionicons name={p.icon as any} size={20} color={colors.onSurface} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.planTitle}>{p.title}</Text>
                <Text style={styles.planDesc} numberOfLines={1}>{p.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtle} />
            </PressScale>
          ))}
          <View style={styles.trust}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.muted} />
            <Text style={styles.trustText}>Businesses can send presenters an offer to start a conversation.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg },
  login: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill, paddingHorizontal: spacing.lg, height: 40, justifyContent: "center" },
  loginText: { color: colors.onSurface, fontWeight: "800", fontSize: 14 },
  h1: { color: colors.onSurface, fontSize: 34, lineHeight: 37, fontWeight: "800", letterSpacing: -0.8, marginTop: spacing.xxl, paddingHorizontal: spacing.lg },
  sub: { color: colors.muted, fontSize: 17, lineHeight: 24, marginTop: spacing.md, paddingHorizontal: spacing.lg },
  strip: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  stripCard: { width: 144, height: 192, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surfaceSecondary },
  stripInfo: { position: "absolute", left: 10, right: 10, bottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  stripName: { color: colors.onSurface, fontWeight: "800", fontSize: 14, flexShrink: 1 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  price: { alignSelf: "flex-start", marginTop: 6, backgroundColor: colors.pricePill, borderRadius: 12, height: 24, paddingHorizontal: 10, justifyContent: "center" },
  priceText: { color: colors.onPricePill, fontSize: 11, fontWeight: "800" },
  pad: { paddingHorizontal: spacing.lg },
  note: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: spacing.md, lineHeight: 17 },
  sides: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xxl },
  side: { flex: 1, backgroundColor: colors.surfaceTertiary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  sideTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 16, marginTop: spacing.md },
  sideBody: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  section: { color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase", marginTop: spacing.xxl, marginBottom: spacing.md },
  plan: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceTertiary, borderRadius: radius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  planIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  planTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 16 },
  planDesc: { color: colors.muted, fontSize: 13, marginTop: 2 },
  trust: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: spacing.xl },
  trustText: { color: colors.muted, fontSize: 12, flexShrink: 1, textAlign: "center" },
});
