import Ionicons from "@react-native-vector-icons/ionicons";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Presenter, request } from "@/src/api";
import { useApi, useAppAuth } from "@/src/auth";
import { PresenterCard } from "@/src/components/PresenterCard";
import { PresenterDetail } from "@/src/components/PresenterDetail";
import { Button, Chip, EmptyState, Loading, Logo, PressScale } from "@/src/components/ui";
import { usesNativeTabs } from "@/src/navigation";
import { colors, radius, spacing } from "@/src/theme";

const PAGE = 20;

export default function BrowseTab() {
  const { me } = useAppAuth();
  return me?.role === "presenter" ? <MyPublicProfile /> : <BrowseGrid />;
}

function BrowseGrid() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [cat, setCat] = useState("All");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const cats = useQuery({ queryKey: ["categories"], queryFn: () => request<string[]>("/categories", null), staleTime: Infinity });
  const list = useInfiniteQuery({
    queryKey: ["presenters", debounced, cat],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      request<Presenter[]>(`/presenters?limit=${PAGE}&skip=${pageParam}&q=${encodeURIComponent(debounced)}&category=${encodeURIComponent(cat)}`, null),
    getNextPageParam: (last, all) => (last.length < PAGE ? undefined : all.length * PAGE),
  });
  const data = list.data?.pages.flat() ?? [];
  const cardW = (Math.min(width, 700) - spacing.lg * 2 - spacing.md) / 2;

  return (
    <View style={styles.root} testID="browse-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.titleRow}>
          <Logo size={22} />
        </View>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search presenters, cities, niches" placeholderTextColor={colors.subtle}
            style={styles.searchInput} returnKeyType="search" testID="browse-search-input" autoCorrect={false} />
          {q ? (
            <PressScale onPress={() => setQ("")} testID="browse-search-clear-button" style={styles.clear}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </PressScale>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chips} testID="browse-category-chips">
          {["All", ...(cats.data ?? [])].map((c) => (
            <Chip key={c} label={c} selected={cat === c} onPress={() => setCat(c)} testID={`category-chip-${c.toLowerCase().replace(/\s/g, "-")}`} />
          ))}
        </ScrollView>
      </View>

      {list.isLoading ? <Loading testID="browse-loading" /> : list.isError ? (
        <EmptyState icon="cloud-offline-outline" title="Couldn't load presenters" body="Check your connection and try again."
          action={<Button title="Retry" variant="glass" onPress={() => list.refetch()} testID="browse-retry-button" />} testID="browse-error" />
      ) : (
        <FlatList
          data={data}
          key="grid"
          numColumns={2}
          keyExtractor={(p) => p.user_id}
          columnWrapperStyle={{ gap: spacing.md }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: bottomChrome + spacing.xl, gap: spacing.md }}
          renderItem={({ item }) => <PresenterCard p={item} width={cardW} onPress={() => router.push(`/presenter/${item.user_id}`)} />}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          onEndReachedThreshold={0.6}
          refreshControl={<RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={() => { list.refetch(); }} tintColor={colors.onSurface} />}
          ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.onSurface} style={{ margin: spacing.lg }} /> : undefined}
          ListEmptyComponent={
            <EmptyState icon="search-outline" title="No presenters found" body="Try another search or category."
              action={<Button title="Clear filters" variant="glass" onPress={() => { setQ(""); setCat("All"); }} testID="browse-clear-filters-button" />}
              testID="browse-empty" />
          }
          removeClippedSubviews
          initialNumToRender={8}
          windowSize={7}
          testID="browse-grid"
        />
      )}
    </View>
  );
}

function MyPublicProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const api = useApi();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const q = useQuery({ queryKey: ["my-presenter"], queryFn: () => api<Presenter>("/presenters/me") });
  if (q.isLoading) return <View style={styles.root}><Loading testID="my-profile-loading" /></View>;
  if (!q.data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <EmptyState icon="person-outline" title="Couldn't load your profile" action={<Button title="Retry" variant="glass" onPress={() => q.refetch()} testID="my-profile-retry-button" />} />
      </View>
    );
  }
  return (
    <View style={styles.root} testID="my-public-profile-screen">
      <PresenterDetail
        p={q.data}
        topInset={insets.top}
        bottomPad={bottomChrome + spacing.xl}
        header={
          <>
            <View style={styles.badge}><Text style={styles.badgeText}>How brands see you</Text></View>
            <PressScale onPress={() => router.push("/edit-profile")} style={styles.editBtn} testID="browse-edit-profile-button">
              <Ionicons name="create-outline" size={20} color={colors.onSurface} />
            </PressScale>
          </>
        }
        footer={<Button title="Edit profile & prices" onPress={() => router.push("/edit-profile")} style={{ marginTop: spacing.md }} testID="my-profile-edit-button" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  titleRow: { paddingHorizontal: spacing.lg, height: 44, justifyContent: "center" },
  search: {
    marginHorizontal: spacing.lg, marginTop: spacing.sm, height: 48, borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary,
    borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", paddingLeft: spacing.lg, gap: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.onSurface, fontSize: 15, height: 48 },
  clear: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  chipRow: { height: 56, flexGrow: 0 },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" },
  badge: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill, paddingHorizontal: spacing.md, height: 32, justifyContent: "center" },
  badgeText: { color: colors.onSurface, fontWeight: "700", fontSize: 12 },
  editBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
});
