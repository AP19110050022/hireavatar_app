import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Presenter, request, rupees } from "@/src/api";
import { useAppAuth } from "@/src/auth";
import { PresenterDetail } from "@/src/components/PresenterDetail";
import { goBack, Button, EmptyState, Loading, PressScale } from "@/src/components/ui";
import { colors, spacing } from "@/src/theme";

export default function PresenterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { me } = useAppAuth();
  const q = useQuery({ queryKey: ["presenter", id], queryFn: () => request<Presenter>(`/presenters/${id}`, null) });
  const isBusiness = me?.role === "business";

  const back = (
    <PressScale onPress={() => goBack(router)} style={styles.circle} testID="presenter-back-button">
      <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
    </PressScale>
  );

  if (q.isLoading) return <View style={styles.root}><Loading testID="presenter-loading" /></View>;
  if (!q.data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg }]}>
        {back}
        <EmptyState icon="person-outline" title="Couldn't load this profile" action={<Button title="Retry" variant="glass" onPress={() => q.refetch()} testID="presenter-retry-button" />} />
      </View>
    );
  }

  return (
    <View style={styles.root} testID="presenter-screen">
      <PresenterDetail p={q.data} topInset={insets.top} bottomPad={(isBusiness ? 110 : spacing.xl) + insets.bottom} header={back} />
      {isBusiness ? (
        <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.from}>From</Text>
            <Text style={styles.price}>{rupees(q.data.price_per_video)}<Text style={styles.unit}> /video</Text></Text>
          </View>
          <Button title="Send offer" onPress={() => router.push(`/offer/${q.data!.user_id}`)} style={{ flex: 1.3 }} testID="presenter-send-offer-button" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  circle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.scrim, alignItems: "center", justifyContent: "center" },
  cta: {
    position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: spacing.lg,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surfaceElevated, borderTopWidth: 1, borderTopColor: colors.border,
  },
  from: { color: colors.muted, fontSize: 12 },
  price: { color: colors.onSurface, fontSize: 22, fontWeight: "800" },
  unit: { color: colors.muted, fontSize: 13, fontWeight: "600" },
});
