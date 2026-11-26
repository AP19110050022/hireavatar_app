import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, { FadeInUp, FadeOutUp, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing } from "@/src/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Go back, or to the app root when the screen was opened directly (deep link / refresh). */
export function goBack(router: { canGoBack: () => boolean; back: () => void; replace: (p: any) => void }) {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export const LOGO = "https://www.hireavatar.co/hireavatar-logo2.jpeg";

export function Logo({ size = 28, testID }: { size?: number; testID?: string }) {
  return (
    <View style={styles.logoRow} testID={testID}>
      <View style={[styles.logoBox, { width: size * 1.3, height: size * 1.3, borderRadius: size * 0.26 }]}>
        <Image source={LOGO} style={StyleSheet.absoluteFill} contentFit="cover" />
      </View>
      <Text style={[styles.logoText, { fontSize: size }]}>
        HireAvatar<Text style={{ color: colors.brand }}>.</Text>
      </Text>
    </View>
  );
}

export function PressScale({ children, onPress, style, disabled, testID }: {
  children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean; testID?: string;
}) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are intentionally mutable.
      onPressIn={() => (s.value = withSpring(0.97, { damping: 20, stiffness: 400 }))}
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are intentionally mutable.
      onPressOut={() => (s.value = withSpring(1, { damping: 20, stiffness: 400 }))}
      style={[style, a, disabled ? { opacity: 0.5 } : null]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function Button({ title, onPress, variant = "primary", loading, disabled, icon, testID, style }: {
  title: string; onPress?: () => void; variant?: "primary" | "glass" | "pink" | "danger"; loading?: boolean;
  disabled?: boolean; icon?: string; testID?: string; style?: ViewStyle;
}) {
  const bg = variant === "primary" ? colors.brandPrimary : variant === "pink" ? colors.brand : variant === "danger" ? "transparent" : colors.surfaceSecondary;
  const fg = variant === "primary" ? colors.onBrandPrimary : variant === "danger" ? colors.error : colors.onSurface;
  return (
    <PressScale testID={testID} onPress={onPress} disabled={disabled || loading}
      style={[styles.btn, { backgroundColor: bg }, variant === "danger" ? { borderWidth: 1, borderColor: colors.error } : {}, style ?? {}]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={styles.btnInner}>
          {icon ? <Ionicons name={icon as any} size={20} color={fg} /> : null}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </PressScale>
  );
}

export function Chip({ label, selected, onPress, testID }: { label: string; selected?: boolean; onPress?: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress}
      style={[styles.chip, selected ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary } : null]}>
      <Text style={[styles.chipText, { color: selected ? colors.onBrandPrimary : colors.onSurface }]}>{label}</Text>
    </Pressable>
  );
}

export function GradientTile({ icon, from, to, size = 44 }: { icon: string; from: string; to: string; size?: number }) {
  return (
    <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size * 0.36, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon as any} size={size * 0.48} color={colors.onSurface} />
    </LinearGradient>
  );
}

export function Backdrop() {
  return (
    <LinearGradient colors={[colors.bgTop, colors.surface, colors.surface]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
  );
}

export function StatusPill({ status }: { status: "pending" | "accepted" | "declined" }) {
  const map = {
    pending: { bg: colors.warning, fg: colors.onWarning, label: "Pending" },
    accepted: { bg: colors.success, fg: colors.onSuccess, label: "Accepted" },
    declined: { bg: colors.surfaceSecondary, fg: colors.muted, label: "Declined" },
  }[status];
  return (
    <View style={[styles.pill, { backgroundColor: map.bg }]} testID={`status-pill-${status}`}>
      <Text style={[styles.pillText, { color: map.fg }]}>{map.label}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, body, action, testID }: { icon: string; title: string; body?: string; action?: React.ReactNode; testID?: string }) {
  return (
    <View style={styles.empty} testID={testID}>
      <GradientTile icon={icon} from={colors.gradViolet} to={colors.gradPink} size={64} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {action}
    </View>
  );
}

export function Loading({ testID }: { testID?: string }) {
  return (
    <View style={styles.loading} testID={testID}>
      <ActivityIndicator color={colors.onSurface} />
    </View>
  );
}

// ------------------------------------------------------------- toast
type ToastKind = "success" | "error" | "info";
const ToastCtx = createContext<(msg: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind; id: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string, kind: ToastKind = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, kind, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  const accent = toast?.kind === "error" ? colors.error : toast?.kind === "success" ? colors.success : colors.brand;
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View key={toast.id} entering={FadeInUp} exiting={FadeOutUp} pointerEvents="none"
          style={[styles.toast, { top: insets.top + spacing.sm }]} testID="app-toast">
          <View style={[styles.toastDot, { backgroundColor: accent }]} />
          <Text style={styles.toastText} testID="app-toast-text">{toast.msg}</Text>
        </Animated.View>
      ) : null}
    </ToastCtx.Provider>
  );
}

const styles = StyleSheet.create({
  logoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logoBox: { backgroundColor: colors.surfaceInverse, overflow: "hidden" },
  logoText: { color: colors.onSurface, fontWeight: "800", letterSpacing: -0.5 },
  btn: { height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  btnInner: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  btnText: { fontSize: 16, fontWeight: "800" },
  chip: {
    height: 36, flexShrink: 0, paddingHorizontal: spacing.lg, borderRadius: radius.pill, justifyContent: "center",
    backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border,
  },
  chipText: { fontSize: 14, fontWeight: "700" },
  pill: { paddingHorizontal: 10, height: 24, borderRadius: 12, justifyContent: "center" },
  pillText: { fontSize: 12, fontWeight: "800" },
  empty: { alignItems: "center", paddingHorizontal: spacing.xxl, paddingVertical: spacing.xxxl, gap: spacing.md },
  emptyTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800", textAlign: "center", marginTop: spacing.sm },
  emptyBody: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl },
  toast: {
    position: "absolute", left: spacing.lg, right: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceElevated, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.borderStrong,
  },
  toastDot: { width: 8, height: 8, borderRadius: 4 },
  toastText: { color: colors.onSurface, fontSize: 14, fontWeight: "600", flex: 1 },
});
