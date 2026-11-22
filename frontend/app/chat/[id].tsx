import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Conversation, imgUrl, Message } from "@/src/api";
import { useApi, useAppAuth } from "@/src/auth";
import { goBack, Loading, PressScale, useToast } from "@/src/components/ui";
import { colors, radius, spacing } from "@/src/theme";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const api = useApi();
  const toast = useToast();
  const qc = useQueryClient();
  const { me } = useAppAuth();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const conv = useQuery({ queryKey: ["conversation", id], queryFn: () => api<Conversation>(`/conversations/${id}`) });
  const msgs = useQuery({ queryKey: ["messages", id], queryFn: () => api<Message[]>(`/conversations/${id}/messages`), refetchInterval: 4000 });
  const reversed = useMemo(() => [...(msgs.data ?? [])].reverse(), [msgs.data]);
  const isPresenter = me?.role === "presenter";
  const c = conv.data;
  const title = c ? (isPresenter ? c.business_name : c.presenter_name) : "";

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setText("");
    try {
      const m = await api<Message>(`/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ text: t }) });
      qc.setQueryData<Message[]>(["messages", id], (old) => [...(old ?? []), m]);
      qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch (e: any) {
      setText(t);
      toast(e.message, "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.root} testID="chat-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <PressScale onPress={() => goBack(router)} style={styles.back} testID="chat-back-button">
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </PressScale>
        {c && !isPresenter ? <Image source={imgUrl(c.presenter_photo)} style={styles.avatar} contentFit="cover" /> : (
          <View style={[styles.avatar, styles.initial]}><Text style={styles.initialText}>{title.charAt(0).toUpperCase()}</Text></View>
        )}
        <PressScale onPress={() => c && !isPresenter && router.push(`/presenter/${c.presenter_id}`)} style={{ flex: 1 }} testID="chat-title-button">
          <Text style={styles.title} numberOfLines={1} testID="chat-title">{title}</Text>
          <Text style={styles.subtitle}>{isPresenter ? "Business" : "Presenter"}</Text>
        </PressScale>
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {msgs.isLoading ? <Loading testID="chat-loading" /> : (
          <FlatList
            data={reversed}
            inverted
            keyExtractor={(m) => m.message_id}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const mine = item.sender_id === me?.user_id;
              return (
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs]} testID={`chat-message-${item.message_id}`}>
                  <Text style={styles.msgText}>{item.text}</Text>
                  <Text style={styles.msgTime}>{new Date(item.created_at.endsWith("Z") ? item.created_at : item.created_at + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                </View>
              );
            }}
            testID="chat-messages-list"
          />
        )}
        <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <TextInput value={text} onChangeText={setText} placeholder="Write a message" placeholderTextColor={colors.subtle} multiline maxLength={2000}
            style={styles.input} testID="chat-message-input" />
          <PressScale onPress={send} disabled={!text.trim() || sending} style={styles.send} testID="chat-send-button">
            <Ionicons name="arrow-up" size={22} color={colors.onBrandPrimary} />
          </PressScale>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surfaceElevated, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary },
  initial: { alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary },
  initialText: { color: colors.onBrandTertiary, fontWeight: "800", fontSize: 16 },
  title: { color: colors.onSurface, fontSize: 17, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 12 },
  bubble: { maxWidth: "80%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.brandTertiary, borderBottomRightRadius: 6 },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.surfaceSecondary, borderBottomLeftRadius: 6 },
  msgText: { color: colors.onSurface, fontSize: 15, lineHeight: 21 },
  msgTime: { color: colors.muted, fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, backgroundColor: colors.surfaceElevated, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: radius.lg, backgroundColor: colors.surfaceTertiary, color: colors.onSurface, paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 12, fontSize: 15 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
});
