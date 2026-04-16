// ###########################################################################
// # TabBarOverlay — Frosted glass tab bar rendered INSIDE each screen
// # Uses usePathname/useRouter for standalone navigation (no BottomTabBarProps)
// # Positioned absolutely at the bottom of the screen content
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useThemeStore } from "@/store/themeStore";

const TAB_ITEMS = [
  { route: "/(tabs)", name: "index", active: "reader", inactive: "reader-outline" },
  { route: "/(tabs)/search", name: "search", active: "search", inactive: "search-outline" },
  { route: "/(tabs)/quiz", name: "quiz", active: "game-controller", inactive: "game-controller-outline" },
  { route: "/(tabs)/bookmarks", name: "bookmarks", active: "bookmark", inactive: "bookmark-outline" },
] as const;

export function TabBarOverlay() {
  const colors = useColors();
  const mode = useThemeStore((s) => s.mode);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const isDark = mode === "dark";
  const bottomPadding = Platform.OS === "web" ? 16 : Math.max(insets.bottom, 12);

  return (
    <View
      style={[styles.wrapper, { paddingBottom: bottomPadding }]}
      pointerEvents="box-none"
    >
      <View style={styles.barContainer}>
        {/* Frosted glass background */}
        {Platform.OS === "web" ? (
          <View
            style={[
              styles.glassBackground,
              {
                backgroundColor: isDark
                  ? "rgba(35, 35, 45, 0.78)"
                  : "rgba(255, 255, 255, 0.68)",
                // @ts-ignore — CSS backdrop-filter for web
                backdropFilter: "blur(28px) saturate(1.5)",
                WebkitBackdropFilter: "blur(28px) saturate(1.5)",
              },
            ]}
          />
        ) : (
          <BlurView
            intensity={70}
            tint={isDark ? "dark" : "light"}
            style={styles.glassBackground}
          />
        )}

        {/* Subtle border for glass edge */}
        <View
          style={[
            styles.glassBorder,
            {
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.12)"
                : "rgba(0, 0, 0, 0.08)",
            },
          ]}
        />

        {/* Tab icons */}
        <View style={styles.tabsRow}>
          {TAB_ITEMS.map((tab) => {
            const isFocused =
              tab.name === "index"
                ? pathname === "/" || pathname === "/(tabs)"
                : pathname.includes(tab.name);

            return (
              <Pressable
                key={tab.name}
                onPress={() => router.push(tab.route as any)}
                style={styles.tabBtn}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
              >
                <View
                  style={[
                    styles.iconCircle,
                    isFocused
                      ? { backgroundColor: colors.text }
                      : {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.05)",
                        },
                  ]}
                >
                  <Ionicons
                    name={(isFocused ? tab.active : tab.inactive) as any}
                    size={20}
                    color={
                      isFocused
                        ? colors.background
                        : isDark
                          ? "rgba(255,255,255,0.45)"
                          : "rgba(0,0,0,0.35)"
                    }
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  barContainer: {
    width: 272,
    height: 58,
    borderRadius: 29,
    overflow: "hidden",
    position: "relative",
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 29,
  },
  glassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 29,
    borderWidth: 1,
  },
  tabsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 8,
  },
  tabBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
