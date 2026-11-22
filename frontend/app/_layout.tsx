import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { LogBox, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppAuthProvider, CLERK_KEY, useAppAuth } from "@/src/auth";
import { ErrorBoundary } from "@/src/components/error-boundary";
import { Loading, Logo, ToastProvider } from "@/src/components/ui";
import { queryClient } from "@/src/query-client";
import { colors } from "@/src/theme";

LogBox.ignoreAllLogs(true);

const PUBLIC = new Set(["", "index", "sign-in"]);

function Gate() {
  const { status, me } = useAppAuth();
  const segments = useSegments();
  const router = useRouter();
  const first = (segments[0] as string | undefined) ?? "";

  useEffect(() => {
    if (status === "loading") return;
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
  if (!CLERK_KEY) return <>{children}</>;
  return (
    <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
      {children}
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
              <AppAuthProvider>
                <KeyboardProvider>
                  <ToastProvider>
                    <StatusBar style="light" />
                    <Gate />
                  </ToastProvider>
                </KeyboardProvider>
              </AppAuthProvider>
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
});
