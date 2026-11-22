import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { imgUrl, PLANS, Presenter, rupees } from "@/src/api";
import { colors, radius, spacing } from "@/src/theme";

/** Public presenter profile body (hero photos, bio, hiring plans). */
export function PresenterDetail({ p, topInset, bottomPad, header, footer }: {
  p: Presenter; topInset: number; bottomPad: number; header?: React.ReactNode; footer?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const [idx, setIdx] = useState(0);
  const heroH = Math.min(width * 1.15, 560);
  const photos = p.photos.length ? p.photos : [""];

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad }} showsVerticalScrollIndicator={false} testID="presenter-detail">
      <View style={{ height: heroH }}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(u, i) => `${i}-${u}`}
          onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <Image source={imgUrl(item)} style={{ width, height: heroH, backgroundColor: colors.surfaceTertiary }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
          )}
        />
        <LinearGradient colors={[colors.scrimClear, colors.scrimClear, colors.surface]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[styles.headerSlot, { top: topInset + spacing.sm }]}>{header}</View>
        {photos.length > 1 ? (
          <View style={styles.dots}>
            {photos.map((_, i) => <View key={i} style={[styles.pageDot, i === idx ? styles.pageDotOn : null]} />)}
          </View>
        ) : null}
        <View style={styles.heroInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} testID="presenter-name">{p.name}</Text>
            {p.online ? <View style={styles.dot} /> : null}
          </View>
          {p.headline ? <Text style={styles.headline}>{p.headline}</Text> : null}
          <View style={styles.metaRow}>
            {p.city ? <Meta icon="location-outline" text={p.city} /> : null}
            {p.languages.length ? <Meta icon="chatbubble-ellipses-outline" text={p.languages.join(", ")} /> : null}
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {p.categories.length ? (
          <View style={styles.tags}>
            {p.categories.map((c) => (
              <View key={c} style={styles.tag}><Text style={styles.tagText}>{c}</Text></View>
            ))}
          </View>
        ) : null}

        {p.bio ? (
          <View style={styles.card}>
            <Text style={styles.label}>About</Text>
            <Text style={styles.bio} testID="presenter-bio">{p.bio}</Text>
          </View>
        ) : null}

        <Text style={styles.section}>Three simple ways to hire</Text>
        {PLANS.map((plan) => (
          <View key={plan.key} style={styles.plan} testID={`plan-card-${plan.key}`}>
            <View style={styles.planIcon}><Ionicons name={plan.icon as any} size={20} color={colors.onSurface} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planTitle}>{plan.title}</Text>
              <Text style={styles.planDesc}>{plan.desc}</Text>
            </View>
            <View style={styles.pricePill}>
              <Text style={styles.priceText} testID={`plan-price-${plan.key}`}>{rupees(p[plan.priceKey] as number)}</Text>
              <Text style={styles.priceUnit}>{plan.unit}</Text>
            </View>
          </View>
        ))}
        {footer}
      </View>
    </ScrollView>
  );
}

function Meta({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon as any} size={14} color={colors.muted} />
      <Text style={styles.metaText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerSlot: { position: "absolute", left: spacing.lg, right: spacing.lg, flexDirection: "row", justifyContent: "space-between" },
  dots: { position: "absolute", top: 0, bottom: 0, right: spacing.md, justifyContent: "center", gap: 6 },
  pageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
  pageDotOn: { backgroundColor: colors.onSurface, height: 16 },
  heroInfo: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.md },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { color: colors.onSurface, fontSize: 32, fontWeight: "800", letterSpacing: -0.5, flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  headline: { color: colors.muted, fontSize: 16, marginTop: spacing.xs },
  metaRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.sm, flexWrap: "wrap" },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: colors.muted, fontSize: 13 },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tag: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, paddingHorizontal: spacing.md, height: 28, justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  tagText: { color: colors.onSurface, fontSize: 12, fontWeight: "700" },
  card: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: spacing.sm },
  bio: { color: colors.onSurface, fontSize: 15, lineHeight: 22 },
  section: { color: colors.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2, marginTop: spacing.md },
  plan: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceTertiary, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  planIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  planTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  planDesc: { color: colors.muted, fontSize: 13, marginTop: 2 },
  pricePill: { backgroundColor: colors.pricePill, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6, alignItems: "flex-end" },
  priceText: { color: colors.onPricePill, fontWeight: "800", fontSize: 13 },
  priceUnit: { color: colors.onPricePill, fontSize: 10, opacity: 0.7 },
});
