// ###########################################################################
// # SkeletonCard — Placeholder anime pendant le chargement
// # Mime exactement le design du NewsCard (full-image, overlay gradient)
// # borderRadius 22, memes dimensions, shimmer pulse
// ###########################################################################

import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";

// ── Shimmer Block ─────────────────────────────────────────────────────────
function ShimmerBlock({ style }: { style: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[style, { opacity }]} />;
}

// ── Skeleton Card — Mime le NewsCard (full-image + overlay) ───────────────
const CARD_HEIGHT_FEATURED = 300;
const CARD_HEIGHT_REGULAR = 200;

export function SkeletonCard({ isFeatured = false }: { isFeatured?: boolean }) {
  const colors = useColors();
  const cardHeight = isFeatured ? CARD_HEIGHT_FEATURED : CARD_HEIGHT_REGULAR;
  const shimmerColor = colors.surfaceLight;

  return (
    <View
      style={[
        styles.card,
        {
          height: cardHeight,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Fond plein shimmer (simule l'image) */}
      <ShimmerBlock
        style={[StyleSheet.absoluteFillObject, { backgroundColor: shimmerColor }]}
      />

      {/* Overlay gradient identique au NewsCard */}
      <View style={styles.overlay}>
        {/* Haut : badge categorie shimmer + menu dot shimmer */}
        <View style={styles.topRow}>
          <ShimmerBlock style={[styles.categoryBadge, { backgroundColor: "rgba(255,255,255,0.08)" }]} />
          <View style={{ flex: 1 }} />
          <ShimmerBlock style={[styles.menuDot, { backgroundColor: "rgba(255,255,255,0.08)" }]} />
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Bas : gradient + lignes de titre + meta */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={styles.gradient}
        >
          <ShimmerBlock
            style={[styles.titleLine, { backgroundColor: "rgba(255,255,255,0.12)" }]}
          />
          <ShimmerBlock
            style={[
              styles.titleLineShort,
              { backgroundColor: "rgba(255,255,255,0.12)" },
              isFeatured && styles.titleLineShortFeatured,
            ]}
          />
          <View style={styles.metaRow}>
            <ShimmerBlock style={[styles.metaItem, { backgroundColor: "rgba(255,255,255,0.08)" }]} />
            <ShimmerBlock style={[styles.metaDot, { backgroundColor: "rgba(255,255,255,0.08)" }]} />
            <ShimmerBlock style={[styles.metaItemSmall, { backgroundColor: "rgba(255,255,255,0.08)" }]} />
            <ShimmerBlock style={[styles.metaDot, { backgroundColor: "rgba(255,255,255,0.08)" }]} />
            <ShimmerBlock style={[styles.metaItemSmall, { backgroundColor: "rgba(255,255,255,0.08)" }]} />
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

// ── Skeleton Feed — 1 featured + 3 regulieres ────────────────────────────
export function SkeletonFeed() {
  return (
    <View style={styles.feed}>
      <SkeletonCard isFeatured />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

// ── Styles (identiques a NewsCard pour la coherence) ──────────────────────
const styles = StyleSheet.create({
  feed: {
    paddingTop: 8,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1.5,
    // Shadow identique a NewsCard
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    ...(Platform.OS === "web"
      ? ({
          boxShadow: "0 8px 24px rgba(0,0,0,0.40)",
        } as any)
      : {}),
  },
  overlay: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  categoryBadge: {
    width: 80,
    height: 24,
    borderRadius: 20,
  },
  menuDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  gradient: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 40,
  },
  titleLine: {
    width: "90%",
    height: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  titleLineShort: {
    width: "60%",
    height: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  titleLineShortFeatured: {
    width: "75%",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaItem: {
    width: 55,
    height: 10,
    borderRadius: 5,
  },
  metaItemSmall: {
    width: 28,
    height: 10,
    borderRadius: 5,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
});
