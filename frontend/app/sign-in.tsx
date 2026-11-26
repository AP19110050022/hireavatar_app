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
          <Text style={styles.sub}>Use the same account as hireavatar.co. New here? We’ll create one for you.</Text>
        </View>
        {configured ? <ClerkForm /> : (
          <View style={styles.card} testID="sign-in-not-configured">
            <Text style={styles.cardTitle}>Sign-in is almost ready</Text>
            <Text style={styles.sub}>Sign-in is temporarily unavailable. Please try again shortly.</Text>
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
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp" | "verify">("signIn");
  const [busy, setBusy] = useState<"" | "google" | "submit" | "verify">("");
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

  const submitEmail = async () => {
    if (!signInRes.isLoaded || !signUpRes.isLoaded) return;
    const id = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(id)) return setError("Enter a valid email address");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    setError("");
    setBusy("submit");
    try {
      if (mode === "signIn") {
        const result = await signInRes.signIn.create({ identifier: id, password });
        if (result.status === "complete") await signInRes.setActive({ session: result.createdSessionId });
        else setError("Additional verification is required. Continue on hireavatar.co.");
      } else {
        const result = await signUpRes.signUp.create({ emailAddress: id, password });
        if (result.status === "complete") await signUpRes.setActive({ session: result.createdSessionId });
        else {
          await signUpRes.signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setMode("verify");
        }
      }
    } catch (e: any) {
      setError(errMsg(e, mode === "signIn" ? "Couldn’t sign you in" : "Couldn’t create your account"));
    } finally {
      setBusy("");
    }
  };

  const verify = async () => {
    if (!signInRes.isLoaded || !signUpRes.isLoaded) return;
    setError("");
    setBusy("verify");
    try {
      const r = await signUpRes.signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (r.status === "complete") await signUpRes.setActive({ session: r.createdSessionId });
      else setError("Please finish sign-up on hireavatar.co.");
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
      {mode !== "verify" ? (
        <>
          <TextInput value={email} onChangeText={setEmail} placeholder="you@company.com" placeholderTextColor={colors.subtle}
            autoCapitalize="none" autoComplete="email" keyboardType="email-address" style={styles.input} testID="sign-in-email-input"
            returnKeyType="next" />
          <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.subtle}
            secureTextEntry autoComplete={mode === "signIn" ? "current-password" : "new-password"} style={styles.input} testID="sign-in-password-input"
            returnKeyType="done" onSubmitEditing={submitEmail} />
          <Button title={mode === "signIn" ? "Sign in with email" : "Create account"} variant="glass" onPress={submitEmail} loading={busy === "submit"} disabled={!email || !password} testID="sign-in-email-submit-button" />
          <PressScale onPress={() => { setError(""); setMode(mode === "signIn" ? "signUp" : "signIn"); }} style={styles.link} testID="sign-in-mode-toggle-button">
            <Text style={styles.linkText}>{mode === "signIn" ? "New to HireAvatar? Create an account" : "Already have an account? Sign in"}</Text>
          </PressScale>
        </>
      ) : (
        <>
          <Text style={styles.sent} testID="sign-in-code-sent-text">We sent a verification code to {email.trim()}</Text>
          <TextInput value={code} onChangeText={setCode} placeholder="Enter code" placeholderTextColor={colors.subtle}
            keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} style={[styles.input, styles.codeInput]} testID="sign-in-code-input"
            returnKeyType="done" onSubmitEditing={verify} />
          <Button title="Verify and continue" onPress={verify} loading={busy === "verify"} disabled={code.length < 6} testID="sign-in-verify-button" />
          <PressScale onPress={() => { setMode("signUp"); setCode(""); }} style={styles.link} testID="sign-in-change-email-button">
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
