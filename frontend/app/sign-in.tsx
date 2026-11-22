import { useSSO } from "@clerk/expo";
import { useSignIn, useSignUp } from "@clerk/expo/legacy";
import Ionicons from "@react-native-vector-icons/ionicons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppAuth } from "@/src/auth";
import { goBack, Backdrop, Button, Logo, PressScale } from "@/src/components/ui";
import { colors, radius, spacing } from "@/src/theme";

WebBrowser.maybeCompleteAuthSession();

const errMsg = (e: any, fallback: string) => e?.errors?.[0]?.longMessage ?? e?.errors?.[0]?.message ?? e?.message ?? fallback;

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { configured } = useAppAuth();

  return (
    <View style={styles.root} testID="sign-in-screen">
      <Backdrop />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.lg, flexGrow: 1 }}>
        <PressScale onPress={() => goBack(router)} style={styles.back} testID="sign-in-back-button">
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </PressScale>
        <View style={styles.head}>
          <Logo size={26} />
          <Text style={styles.h1}>Welcome</Text>
          <Text style={styles.sub}>Use the same account as hireavatar.co. New here? We'll create one for you.</Text>
        </View>
        {configured ? <ClerkForm /> : (
          <View style={styles.card} testID="sign-in-not-configured">
            <Text style={styles.cardTitle}>Sign-in is almost ready</Text>
            <Text style={styles.sub}>The account service hasn't been connected yet. Please check back shortly.</Text>
          </View>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

function ClerkForm() {
  const signInRes = useSignIn();
  const signUpRes = useSignUp();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"email" | "signIn" | "signUp">("email");
  const [busy, setBusy] = useState<"" | "google" | "send" | "verify">("");
  const [error, setError] = useState("");

  const google = async () => {
    setError("");
    setBusy("google");
    try {
      const { createdSessionId, setActive } = await startSSOFlow({ strategy: "oauth_google", redirectUrl: Linking.createURL("/") });
      if (createdSessionId && setActive) await setActive({ session: createdSessionId });
    } catch (e) {
      setError(errMsg(e, "Google sign-in failed"));
    } finally {
      setBusy("");
    }
  };

  const sendCode = async () => {
    if (!signInRes.isLoaded || !signUpRes.isLoaded) return;
    const id = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(id)) return setError("Enter a valid email address");
    setError("");
    setBusy("send");
    try {
      const attempt = await signInRes.signIn.create({ identifier: id });
      const factor: any = attempt.supportedFirstFactors?.find((f: any) => f.strategy === "email_code");
      if (!factor) throw new Error("Email codes aren't enabled for this account. Use Google instead.");
      await signInRes.signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      setMode("signIn");
    } catch (e: any) {
      if (e?.errors?.[0]?.code === "form_identifier_not_found") {
        try {
          await signUpRes.signUp.create({ emailAddress: id });
          await signUpRes.signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setMode("signUp");
        } catch (e2) {
          setError(errMsg(e2, "Couldn't send the code"));
        }
      } else setError(errMsg(e, "Couldn't send the code"));
    } finally {
      setBusy("");
    }
  };

  const verify = async () => {
    if (!signInRes.isLoaded || !signUpRes.isLoaded) return;
    setError("");
    setBusy("verify");
    try {
      if (mode === "signIn") {
        const r = await signInRes.signIn.attemptFirstFactor({ strategy: "email_code", code: code.trim() });
        if (r.status === "complete") await signInRes.setActive({ session: r.createdSessionId });
        else setError("Additional verification is required.");
      } else {
        const r = await signUpRes.signUp.attemptEmailAddressVerification({ code: code.trim() });
        if (r.status === "complete") await signUpRes.setActive({ session: r.createdSessionId });
        else setError("Please finish sign-up on hireavatar.co.");
      }
    } catch (e) {
      setError(errMsg(e, "Invalid or expired code"));
    } finally {
      setBusy("");
    }
  };

  return (
    <View style={styles.card}>
      <Button title="Continue with Google" icon="logo-google" onPress={google} loading={busy === "google"} testID="sign-in-google-button" />
      <View style={styles.orRow}>
        <View style={styles.line} /><Text style={styles.or}>or with email</Text><View style={styles.line} />
      </View>
      {mode === "email" ? (
        <>
          <TextInput value={email} onChangeText={setEmail} placeholder="you@company.com" placeholderTextColor={colors.subtle}
            autoCapitalize="none" autoComplete="email" keyboardType="email-address" style={styles.input} testID="sign-in-email-input"
            returnKeyType="send" onSubmitEditing={sendCode} />
          <Button title="Email me a code" variant="glass" onPress={sendCode} loading={busy === "send"} disabled={!email} testID="sign-in-send-code-button" />
        </>
      ) : (
        <>
          <Text style={styles.sent} testID="sign-in-code-sent-text">We sent a 6-digit code to {email.trim()}</Text>
          <TextInput value={code} onChangeText={setCode} placeholder="Enter code" placeholderTextColor={colors.subtle}
            keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} style={[styles.input, styles.codeInput]} testID="sign-in-code-input"
            returnKeyType="done" onSubmitEditing={verify} />
          <Button title="Verify and continue" onPress={verify} loading={busy === "verify"} disabled={code.length < 6} testID="sign-in-verify-button" />
          <PressScale onPress={() => { setMode("email"); setCode(""); }} style={styles.link} testID="sign-in-change-email-button">
            <Text style={styles.linkText}>Use a different email</Text>
          </PressScale>
        </>
      )}
      {error ? <Text style={styles.error} testID="sign-in-error-text">{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  head: { marginTop: spacing.xl, gap: spacing.sm, marginBottom: spacing.xl },
  h1: { color: colors.onSurface, fontSize: 32, fontWeight: "800", marginTop: spacing.lg, letterSpacing: -0.5 },
  sub: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  card: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  orRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.xs },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  input: { height: 54, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.borderStrong, color: colors.onSurface, paddingHorizontal: spacing.lg, fontSize: 16 },
  codeInput: { letterSpacing: 8, fontSize: 22, textAlign: "center", fontWeight: "800" },
  sent: { color: colors.muted, fontSize: 14 },
  link: { alignSelf: "center", padding: spacing.sm },
  linkText: { color: colors.brand, fontWeight: "700" },
  error: { color: colors.error, fontSize: 14, fontWeight: "600" },
});
