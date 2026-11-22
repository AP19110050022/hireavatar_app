import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { imgUrl, Presenter, request } from "@/src/api";
import { useApi } from "@/src/auth";
import { goBack, Button, Chip, Loading, PressScale, useToast } from "@/src/components/ui";
import { colors, radius, spacing } from "@/src/theme";

type Form = Omit<Presenter, "user_id" | "online" | "price_per_video" | "price_part_time" | "price_full_time" | "languages"> & {
  price_per_video: string; price_part_time: string; price_full_time: string; languages: string;
};

export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const api = useApi();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-presenter"], queryFn: () => api<Presenter>("/presenters/me") });
  const cats = useQuery({ queryKey: ["categories"], queryFn: () => request<string[]>("/categories", null), staleTime: Infinity });
  const [f, setF] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.data && !f) {
      const p = q.data;
      setF({ ...p, languages: p.languages.join(", "), price_per_video: String(p.price_per_video), price_part_time: String(p.price_part_time), price_full_time: String(p.price_full_time) });
    }
  }, [q.data, f]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((old) => (old ? { ...old, [k]: v } : old));

  const save = async () => {
    if (!f) return;
    const num = (s: string) => parseInt(s.replace(/\D/g, ""), 10) || 0;
    if (!f.name.trim()) return toast("Name is required", "error");
    if ([f.price_per_video, f.price_part_time, f.price_full_time].some((x) => num(x) < 100)) return toast("Prices must be at least ₹100", "error");
    setSaving(true);
    try {
      const body = {
        name: f.name.trim(), headline: f.headline.trim(), bio: f.bio.trim(), city: f.city.trim(), photos: f.photos, categories: f.categories,
        languages: f.languages.split(",").map((s) => s.trim()).filter(Boolean),
        price_per_video: num(f.price_per_video), price_part_time: num(f.price_part_time), price_full_time: num(f.price_full_time),
      };
      const p = await api<Presenter>("/presenters/me", { method: "PUT", body: JSON.stringify(body) });
      qc.setQueryData(["my-presenter"], p);
      qc.invalidateQueries({ queryKey: ["presenters"] });
      qc.invalidateQueries({ queryKey: ["presenter", p.user_id] });
      toast("Profile saved", "success");
      goBack(router);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (!f) return <View style={styles.root}><Loading testID="edit-profile-loading" /></View>;

  const Field = ({ label, k, ...rest }: { label: string; k: keyof Form } & React.ComponentProps<typeof TextInput>) => (
    <View style={{ marginTop: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={f[k] as string} onChangeText={(t) => set(k, t as any)} placeholderTextColor={colors.subtle} style={styles.input} testID={`edit-${String(k)}-input`} {...rest} />
    </View>
  );

  return (
    <View style={styles.root} testID="edit-profile-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <PressScale onPress={() => goBack(router)} style={styles.close} testID="edit-profile-close-button">
          <Ionicons name="close" size={22} color={colors.onSurface} />
        </PressScale>
        <Text style={styles.title}>Edit profile</Text>
        <View style={{ width: 44 }} />
      </View>
      <KeyboardAwareScrollView bottomOffset={110} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <View style={styles.card}>
          <Text style={styles.label}>Photos</Text>
          <View style={styles.photos}>
            {f.photos.slice(0, 1).map((u, i) => (
              <View key={u + i} style={styles.photo}>
                <Image source={imgUrl(u)} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                {i === 0 ? <View style={styles.cover}><Text style={styles.coverText}>Cover</Text></View> : null}
              </View>
            ))}
          </View>
          <Text style={styles.permText} testID="edit-photo-web-note">To keep one shared profile everywhere, update your cover photo on hireavatar.co.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>About you</Text>
          {Field({ label: "Name", k: "name", maxLength: 60 })}
          {Field({ label: "Headline", k: "headline", maxLength: 80, placeholder: "e.g. Warm, relatable lifestyle host" })}
          {Field({ label: "City", k: "city", maxLength: 40 })}
          {Field({ label: "Languages (comma separated)", k: "languages", placeholder: "English, Hindi" })}
          {Field({ label: "Bio", k: "bio", multiline: true, maxLength: 600, style: [styles.input, styles.area], textAlignVertical: "top" })}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Categories</Text>
          <View style={styles.cats}>
            {(cats.data ?? []).map((c) => {
              const on = f.categories.includes(c);
              return <Chip key={c} label={c} selected={on} testID={`edit-category-${c.toLowerCase().replace(/\s/g, "-")}`}
                onPress={() => set("categories", on ? f.categories.filter((x) => x !== c) : [...f.categories, c])} />;
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Prices (₹)</Text>
          {Field({ label: "Per Video", k: "price_per_video", keyboardType: "number-pad", maxLength: 8 })}
          {Field({ label: "Part-time / month (8 videos + 1 shoot day)", k: "price_part_time", keyboardType: "number-pad", maxLength: 8 })}
          {Field({ label: "Full-time / month (up to 20 videos)", k: "price_full_time", keyboardType: "number-pad", maxLength: 8 })}
        </View>
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button title="Save profile" onPress={save} loading={saving} testID="edit-profile-save-button" />
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
  card: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2 },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  photo: { width: 96, height: 128, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.surfaceSecondary },
  add: { alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.borderStrong },
  cover: { position: "absolute", left: 6, bottom: 6, backgroundColor: colors.pricePill, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  coverText: { color: colors.onPricePill, fontSize: 10, fontWeight: "800" },
  remove: { position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.scrim, alignItems: "center", justifyContent: "center" },
  permBox: { marginTop: spacing.md, gap: spacing.sm },
  permText: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  fieldLabel: { color: colors.onSurface, fontSize: 13, fontWeight: "700", marginBottom: 6 },
  input: { minHeight: 50, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.borderStrong, color: colors.onSurface, paddingHorizontal: spacing.lg, fontSize: 15 },
  area: { minHeight: 110, paddingTop: 12 },
  cats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surfaceElevated, borderTopWidth: 1, borderTopColor: colors.border },
});
