import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { LogBox, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { API, BASE } from "@/src/api";
import { AppAuthProvider, CLERK_KEY, useAppAuth } from "@/src/auth";
import { ErrorBoundary } from "@/src/components/error-boundary";
import { Button, Loading, Logo, ToastProvider } from "@/src/components/ui";
import { queryClient } from "@/src/query-client";
import { colors } from "@/src/theme";

LogBox.ignoreAllLogs(true);

const PUBLIC = new Set(["", "index", "sign-in"]);

function Gate() {
  const { status, me, error, retry, signOut } = useAppAuth();
  const segments = useSegments();
  const router = useRouter();
  const first = (segments[0] as string | undefined) ?? "";

  useEffect(() => {
    if (status === "loading" || status === "recovery") return;
    const isPublic = PUBLIC.has(first);
    if (status === "signedOut") {
      if (!isPublic) router.replace("/");
      return;
    }
    if (!me?.role) {
      if (first !== "role") router.replace("/role");
      return;
    }
    if (isPublic || first === "role") router.replace("/browse");
  }, [status, me?.role, first, router]);

  if (status === "recovery") {
    return (
      <View style={styles.recovery} testID="auth-recovery-screen">
        <Logo size={30} />
        <Text style={styles.recoveryTitle}>Finish connecting your account</Text>
        <Text style={styles.recoveryBody} testID="auth-recovery-message">{error}</Text>
        <Button title="Try again" onPress={retry} testID="auth-recovery-retry-button" />
        <Button title="Sign out and try another account" variant="glass" onPress={signOut} testID="auth-recovery-sign-out-button" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface }, animation: "slide_from_right" }}>
        <Stack.Screen name="index" options={{ animation: "fade" }} />
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="role" options={{ animation: "fade" }} />
        <Stack.Screen name="offer/[presenterId]" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="edit-profile" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      </Stack>
      {status === "loading" ? (
        <View style={[StyleSheet.absoluteFill, styles.splash]} testID="app-splash">
          <Logo size={30} />
          <Loading />
        </View>
      ) : null}
    </View>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<{ publishable_key: string; proxy_url: string } | null>(null);
  const [state, setState] = useState<"checking" | "ready" | "unavailable">(!CLERK_KEY ? "unavailable" : "checking");
  useEffect(() => {
    if (!CLERK_KEY) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    fetch(`${API}/clerk/config`, { signal: controller.signal })
      .then(async (response) => {
        const next = await response.json();
        if (!response.ok || !next.enabled || !next.publishable_key) throw new Error("Clerk is unavailable");
        setConfig(next);
        setState("ready");
      })
      .catch(() => setState("unavailable"))
      .finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);

  if (state === "checking") {
    return <View style={styles.bootstrap} testID="clerk-connectivity-check"><Logo size={30} /><Loading /></View>;
  }
  if (state === "unavailable") return <AppAuthProvider enabled={false}>{children}</AppAuthProvider>;
  const clerkProxyUrl = config!.proxy_url ? `${BASE}${config!.proxy_url}` : undefined;
  return (
    <ClerkProvider publishableKey={config!.publishable_key} proxyUrl={clerkProxyUrl} tokenCache={tokenCache}>
      <AppAuthProvider>{children}</AppAuthProvider>
    </ClerkProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <Providers>
              <KeyboardProvider>
                <ToastProvider>
                  <StatusBar style="light" />
                  <Gate />
                </ToastProvider>
              </KeyboardProvider>
            </Providers>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  splash: { backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 8 },
  bootstrap: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 8 },
  recovery: { flex: 1, backgroundColor: colors.surface, alignItems: "stretch", justifyContent: "center", padding: 24, gap: 16 },
  recoveryTitle: { color: colors.onSurface, fontSize: 24, fontWeight: "800", marginTop: 8 },
  recoveryBody: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 8 },
});
