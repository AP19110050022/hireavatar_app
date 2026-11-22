// Design tokens for HireAvatar. Dark theme only, filled from /app/design_guidelines.json.
// A plain key is a background, its `on` partner is the text/icon color on top of it.

import { useMemo } from "react";
import { Appearance, StyleSheet } from "react-native";

export type ColorScheme = "light" | "dark";

const dark = {
  surface: "#0A0528",
  onSurface: "#FFFFFF",
  surfaceSecondary: "rgba(255, 255, 255, 0.15)",
  onSurfaceSecondary: "#FFFFFF",
  surfaceTertiary: "rgba(255, 255, 255, 0.08)",
  onSurfaceTertiary: "#FFFFFF",
  surfaceInverse: "#FFFFFF",
  onSurfaceInverse: "#0A0528",
  surfaceElevated: "#1A1142", // solid sheet / tab bar background
  muted: "rgba(255, 255, 255, 0.6)",
  subtle: "rgba(255, 255, 255, 0.4)",

  brand: "#FF5FA2",
  onBrand: "#FFFFFF",
  brandPrimary: "#FFFFFF",
  onBrandPrimary: "#2E1C8C",
  brandSecondary: "#FF5FA2",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#7C5CFF",
  onBrandTertiary: "#FFFFFF",
  pricePill: "#FFFFFF",
  onPricePill: "#3B25A8",
  gradViolet: "#7C5CFF",
  gradPink: "#FF5FA2",
  gradBlue: "#3B82F6",
  bgTop: "#2E1C8C",
  scrim: "rgba(10, 5, 40, 0.92)",
  scrimClear: "rgba(10, 5, 40, 0)",

  success: "#5CE0A0",
  onSuccess: "#000000",
  warning: "#FBBF24",
  onWarning: "#000000",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",

  border: "rgba(255, 255, 255, 0.1)",
  borderStrong: "rgba(255, 255, 255, 0.25)",
  divider: "rgba(255, 255, 255, 0.05)",
};

export type ThemeColors = typeof dark;

export const colors = dark;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 8, md: 12, lg: 22, pill: 999 };

export const defaultScheme: ColorScheme = "dark";
export const themes: { light: ThemeColors; dark: ThemeColors } = { light: dark, dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}
setColorScheme?.("dark");

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  return { scheme: "dark", colors: dark };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors: c } = useTheme();
    return useMemo(() => StyleSheet.create(factory(c)), [c]);
  };
}
