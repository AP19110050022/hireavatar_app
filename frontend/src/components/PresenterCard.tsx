import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { imgUrl, Presenter, rupees } from "@/src/api";
import { PressScale } from "@/src/components/ui";
import { colors, radius, spacing } from "@/src/theme";

function PresenterCardBase({ p, width, onPress }: { p: Presenter; width: number; onPress: () => void }) {
  return (
    <PressScale testID={`presenter-card-${p.user_id}`} onPress={onPress} style={[styles.card, { width, height: width * (4 / 3) }]}>
      {p.photos[0] ? (
        <Image source={imgUrl(p.photos[0])} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} cachePolicy="memory-disk" />
      ) : (
        <View style={styles.initialWrap}><Text style={styles.initial}>{p.name.charAt(0).toUpperCase()}</Text></View>
      )}
      <LinearGradient colors={[colors.scrimClear, colors.scrimClear, colors.scrim]} style={StyleSheet.absoluteFill} />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
          {p.online ? <View style={styles.dot} /> : null}
        </View>
        {p.city ? <Text style={styles.city} numberOfLines={1}>{p.city}</Text> : null}
        <View style={styles.price}>
          <Text style={styles.priceText}>from {rupees(p.price_per_video)}</Text>
        </View>
      </View>
    </PressScale>
  );
}

export const PresenterCard = memo(PresenterCardBase);

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surfaceSecondary },
  initialWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary },
  initial: { color: colors.onBrandTertiary, fontSize: 48, fontWeight: "800" },
  info: { position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { color: colors.onSurface, fontWeight: "800", fontSize: 15, flexShrink: 1 },
  city: { color: colors.muted, fontSize: 12, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  price: { alignSelf: "flex-start", marginTop: spacing.sm, backgroundColor: colors.pricePill, borderRadius: 12, height: 24, paddingHorizontal: 10, justifyContent: "center" },
  priceText: { color: colors.onPricePill, fontSize: 11, fontWeight: "800" },
});
