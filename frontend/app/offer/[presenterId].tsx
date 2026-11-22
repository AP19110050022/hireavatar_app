import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { imgUrl, Offer, Plan, PLANS, Presenter, request, rupees } from "@/src/api";
import { useApi } from "@/src/auth";
import { goBack, Button, Loading, PressScale, useToast } from "@/src/components/ui";
import { colors, radius, spacing } from "@/src/theme";

export default function SendOffer() {
  const { presenterId } = useLocalSearchParams<{ presenterId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const api = useApi();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["presenter", presenterId], queryFn: () => request<Presenter>(`/presenters/${presenterId}`, null) });
  const [plan, setPlan] = useState<Plan>("per_video");
  const [brief, setBrief] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (q.data) {
      const p = PLANS.find((x) => x.key === plan)!;
      setBudget(String(q.data[p.priceKey]));
    }
  }, [q.data, plan]);

  const submit = async () => {
    const amount = parseInt(budget.replace(/\D/g, ""), 10);
    if (brief.trim().length < 5) return setError("Tell the presenter a bit about the video (at least 5 characters).");
    if (!amount || amount < 100) return setError("Budget must be at least ₹100.");
    setError("");
    setBusy(true);
    try {
      const o = await api<Offer>("/offers", { method: "POST", body: JSON.stringify({ presenter_id: presenterId, plan, brief: brief.trim(), budget: amount }) });
      qc.invalidateQueries({ queryKey: ["offers"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast("Offer sent", "success");
      router.replace(`/chat/${o.conversation_id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!q.data) return <View style={styles.root}><Loading /></View>;
  const p = q.data;

  return (
    <View style={styles.root} testID="send-offer-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <PressScale onPress={() => goBack(router)} style={styles.close} testID="send-offer-close-button">
          <Ionicons name="close" size={22} color={colors.onSurface} />
        </PressScale>
        <Text style={styles.title}>Send offer</Text>
        <View style={{ width: 44 }} />
      </View>
      <KeyboardAwareScrollView bottomOffset={110} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <View style={styles.who}>
          <Image source={imgUrl(p.photos[0])} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{p.name}</Text>
            <Text style={styles.muted}>{p.headline || p.city}</Text>
          </View>
        </View>

        <Text style={styles.label}>Hiring option</Text>
        <View style={{ gap: spacing.sm }}>
          {PLANS.map((x) => {
            const on = plan === x.key;
            return (
              <PressScale key={x.key} onPress={() => setPlan(x.key)} style={[styles.plan, on ? styles.planOn : null]} testID={`send-offer-plan-${x.key}`}>
                <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={22} color={on ? colors.onSurface : colors.subtle} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>{x.title}</Text>
                  <Text style={styles.muted}>{x.desc}</Text>
                </View>
                <Text style={styles.planPrice}>{rupees(p[x.priceKey] as number)}</Text>
              </PressScale>
            );
          })}
        </View>

        <Text style={styles.label}>Brief</Text>
        <TextInput value={brief} onChangeText={setBrief} multiline maxLength={1000} placeholder="What's the video about? Product, tone, length, deadline…"
          placeholderTextColor={colors.subtle} style={[styles.input, styles.area]} testID="send-offer-brief-input" textAlignVertical="top" />

        <Text style={styles.label}>Your budget (₹)</Text>
        <TextInput value={budget} onChangeText={(t) => setBudget(t.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={9}
          placeholder="e.g. 1500" placeholderTextColor={colors.subtle} style={styles.input} testID="send-offer-budget-input" />
        <Text style={styles.hint}>No payment now — the presenter accepts or declines, then you agree on details in chat.</Text>
        {error ? <Text style={styles.error} testID="send-offer-error-text">{error}</Text> : null}
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button title="Send offer" onPress={submit} loading={busy} testID="send-offer-submit-button" />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  title: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  who: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceTertiary },
  name: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  muted: { color: colors.muted, fontSize: 13, marginTop: 2 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2, marginTop: spacing.xl, marginBottom: spacing.sm },
  plan: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceTertiary, borderWidth: 1.5, borderColor: colors.border },
  planOn: { borderColor: colors.onSurface, backgroundColor: colors.surfaceSecondary },
  planTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 15 },
  planPrice: { color: colors.onSurface, fontWeight: "800" },
  input: { minHeight: 54, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.borderStrong, color: colors.onSurface, paddingHorizontal: spacing.lg, fontSize: 16 },
  area: { minHeight: 120, paddingTop: 14 },
  hint: { color: colors.muted, fontSize: 12, marginTop: spacing.sm, lineHeight: 17 },
  error: { color: colors.error, fontSize: 14, fontWeight: "600", marginTop: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surfaceElevated, borderTopWidth: 1, borderTopColor: colors.border },
});
