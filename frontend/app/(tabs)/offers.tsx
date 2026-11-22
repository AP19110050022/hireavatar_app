import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { imgUrl, Offer, planTitle, rupees } from "@/src/api";
import { useApi, useAppAuth } from "@/src/auth";
import { Button, Chip, EmptyState, Loading, PressScale, StatusPill } from "@/src/components/ui";
import { usesNativeTabs } from "@/src/navigation";
import { colors, radius, spacing } from "@/src/theme";

const FILTERS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
];

export default function OffersTab() {
  const insets = useSafeAreaInsets();
  const api = useApi();
  const router = useRouter();
  const { me } = useAppAuth();
  const isPresenter = me?.role === "presenter";
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const [filter, setFilter] = useState("");

  const q = useQuery({ queryKey: ["offers", filter], queryFn: () => api<Offer[]>(`/offers?status=${filter}`) });

  const renderItem = ({ item, index }: { item: Offer; index: number }) => {
    const other = isPresenter ? item.business_name : item.presenter_name;
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(300)}>
        <View style={styles.card} testID={`offer-card-${item.offer_id}`}>
          <View style={styles.row}>
            {isPresenter ? (
              <View style={[styles.avatar, styles.initial]}><Text style={styles.initialText}>{other.charAt(0).toUpperCase()}</Text></View>
            ) : (
              <Image source={imgUrl(item.presenter_photo)} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{other}</Text>
              <Text style={styles.meta}>{planTitle(item.plan)} · {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <StatusPill status={item.status} />
          </View>
          <Text style={styles.brief} numberOfLines={3}>{item.brief}</Text>
          <View style={styles.row}>
            <Text style={styles.budget} testID={`offer-budget-${item.offer_id}`}>{rupees(item.budget)}</Text>
            <View style={{ flex: 1 }} />
            <PressScale onPress={() => router.push(`/chat/${item.conversation_id}`)} style={styles.chatBtn} testID={`offer-chat-button-${item.offer_id}`}>
              <Text style={styles.chatText}>Open chat</Text>
            </PressScale>
          </View>
          {isPresenter && item.status === "pending" ? (
            <Text style={styles.liveNote} testID={`offer-action-note-${item.offer_id}`}>Open this conversation to discuss the offer. Offer actions are currently managed on HireAvatar web.</Text>
          ) : null}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.root} testID="offers-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.h1}>Offers</Text>
        <Text style={styles.sub}>{isPresenter ? "Offers businesses sent you" : "Offers you've sent to presenters"}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => (
            <Chip key={f.key || "all"} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} testID={`offers-filter-${f.key || "all"}`} />
          ))}
        </ScrollView>
      </View>
      {q.isLoading ? <Loading testID="offers-loading" /> : q.isError ? (
        <EmptyState icon="cloud-offline-outline" title="Couldn't load offers" action={<Button title="Retry" variant="glass" onPress={() => q.refetch()} testID="offers-retry-button" />} />
      ) : (
        <FlatList
          data={q.data}
          keyExtractor={(o) => o.offer_id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: bottomChrome + spacing.xl, gap: spacing.md, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => { q.refetch(); }} tintColor={colors.onSurface} />}
          ListEmptyComponent={
            <EmptyState icon="file-tray-outline" title="No offers yet" testID="offers-empty"
              body={isPresenter ? "Keep your profile and prices fresh — brands will reach out here." : "Find a presenter you like and send your first offer."}
              action={!isPresenter ? <Button title="Browse presenters" onPress={() => router.push("/browse")} testID="offers-browse-button" /> : null} />
          }
          testID="offers-list"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.divider },
  h1: { color: colors.onSurface, fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  sub: { color: colors.muted, fontSize: 14, marginTop: 2 },
  chipRow: { height: 56, flexGrow: 0, marginHorizontal: -spacing.lg },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" },
  card: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary },
  initial: { alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary },
  initialText: { color: colors.onBrandTertiary, fontWeight: "800", fontSize: 18 },
  name: { color: colors.onSurface, fontWeight: "800", fontSize: 16 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  brief: { color: colors.onSurface, fontSize: 14, lineHeight: 20, opacity: 0.9 },
  budget: { color: colors.onSurface, fontWeight: "800", fontSize: 20 },
  chatBtn: { height: 36, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, justifyContent: "center" },
  chatText: { color: colors.onSurface, fontWeight: "700", fontSize: 13 },
  liveNote: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
