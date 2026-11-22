import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Conversation, imgUrl } from "@/src/api";
import { useApi, useAppAuth } from "@/src/auth";
import { Button, EmptyState, Loading, PressScale } from "@/src/components/ui";
import { usesNativeTabs } from "@/src/navigation";
import { colors, radius, spacing } from "@/src/theme";

export const timeAgo = (iso: string) => {
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return d.toLocaleDateString();
};

export default function MessagesTab() {
  const insets = useSafeAreaInsets();
  const api = useApi();
  const router = useRouter();
  const { me } = useAppAuth();
  const isPresenter = me?.role === "presenter";
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const q = useQuery({ queryKey: ["conversations"], queryFn: () => api<Conversation[]>("/conversations"), refetchInterval: 10000 });

  return (
    <View style={styles.root} testID="messages-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.h1}>Messages</Text>
      </View>
      {q.isLoading ? <Loading testID="messages-loading" /> : q.isError ? (
        <EmptyState icon="cloud-offline-outline" title="Couldn't load chats" action={<Button title="Retry" variant="glass" onPress={() => q.refetch()} testID="messages-retry-button" />} />
      ) : (
        <FlatList
          data={q.data}
          keyExtractor={(c) => c.conversation_id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: bottomChrome + spacing.xl, gap: spacing.sm, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => { q.refetch(); }} tintColor={colors.onSurface} />}
          renderItem={({ item }) => {
            const name = isPresenter ? item.business_name : item.presenter_name;
            return (
              <PressScale onPress={() => router.push(`/chat/${item.conversation_id}`)} style={styles.row} testID={`conversation-row-${item.conversation_id}`}>
                {isPresenter ? (
                  <View style={[styles.avatar, styles.initial]}><Text style={styles.initialText}>{name.charAt(0).toUpperCase()}</Text></View>
                ) : (
                  <Image source={imgUrl(item.presenter_photo)} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.top}>
                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                    <Text style={styles.time}>{timeAgo(item.updated_at)}</Text>
                  </View>
                  <Text style={styles.last} numberOfLines={1}>{item.last_message || "Say hi"}</Text>
                </View>
              </PressScale>
            );
          }}
          ListEmptyComponent={
            <EmptyState icon="chatbubbles-outline" title="No conversations yet" testID="messages-empty"
              body={isPresenter ? "When a business sends you an offer, the chat appears here." : "Send an offer to a presenter to start chatting."} />
          }
          testID="conversations-list"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  h1: { color: colors.onSurface, fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surfaceSecondary },
  initial: { alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary },
  initialText: { color: colors.onBrandTertiary, fontWeight: "800", fontSize: 20 },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { color: colors.onSurface, fontWeight: "800", fontSize: 16, flex: 1 },
  time: { color: colors.muted, fontSize: 12 },
  last: { color: colors.muted, fontSize: 14, marginTop: 2 },
});
