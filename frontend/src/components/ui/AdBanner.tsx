// ###########################################################################
// # AdBanner — Publicite native integree au feed (style NewsCard)
// # Design: carte glass immersive identique aux articles
// # Image de fond + gradient + badge "Sponsorise" + CTA
// # Utilise Google AdMob NativeAd avec fallback si SDK pas dispo
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";

// ── Import conditionnel du SDK AdMob ────────────────────────────────────
// Si le SDK n'est pas configure (pas de google-services.json), on affiche
// un placeholder silencieux au lieu de crasher
let NativeAd: any = null;
let NativeAdView: any = null;
let NativeMediaView: any = null;
let NativeAsset: any = null;
let TestIds: any = null;
let AdEventType: any = null;

try {
  const admob = require("react-native-google-mobile-ads");
  NativeAd = admob.NativeAd;
  NativeAdView = admob.NativeAdView;
  NativeMediaView = admob.NativeMediaView;
  NativeAsset = admob.NativeAsset;
  TestIds = admob.TestIds;
  AdEventType = admob.AdEventType;
} catch {
  // SDK pas disponible (dev web ou pas configure)
}

// ── Ad Unit IDs ─────────────────────────────────────────────────────────
const NATIVE_AD_UNIT_ID = __DEV__
  ? TestIds?.NATIVE ?? "ca-app-pub-3940256099942544/2247696110"
  : Platform.select({
      android: "ca-app-pub-3265708280232482/3462712488",
      ios: "ca-app-pub-3265708280232482/3462712488", // TODO: Remplacer par ton iOS ID si different
      default: "",
    }) ?? "";

// ── Dimensions ──────────────────────────────────────────────────────────
const CARD_HEIGHT = 200;

// ── Composant principal ─────────────────────────────────────────────────
export function AdBanner() {
  const colors = useColors();
  const { t } = useTranslation();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  const [adData, setAdData] = useState<any>(null);

  // Si le SDK n'est pas disponible ou qu'on est sur web, ne rien afficher
  if (!NativeAd || Platform.OS === "web") {
    return null;
  }

  // Si erreur de chargement, ne rien afficher (pas de trou dans le feed)
  if (adError) {
    return null;
  }

  // ── Version Native Ad (SDK disponible) ──────────────────────────────
  return (
    <NativeAd
      adUnitId={NATIVE_AD_UNIT_ID}
      requestOptions={{
        requestNonPersonalizedAdsOnly: true,
        keywords: ["news", "actualites", "verified", "information"],
      }}
      onAdLoaded={(data: any) => {
        setAdData(data);
        setAdLoaded(true);
      }}
      onAdFailedToLoad={() => setAdError(true)}
    >
      <NativeAdView
        style={[
          styles.card,
          { opacity: adLoaded ? 1 : 0 },
        ]}
      >
        {/* ── Fond de la carte ──────────────────────────────────────── */}
        {adData?.images?.[0]?.url ? (
          <ImageBackground
            source={{ uri: adData.images[0].url }}
            style={styles.imageBg}
            imageStyle={styles.imageStyle}
            resizeMode="cover"
          >
            <AdOverlayContent
              adData={adData}
              colors={colors}
              t={t}
            />
          </ImageBackground>
        ) : (
          <View style={[styles.noImageBg, { backgroundColor: colors.primary }]}>
            <View style={styles.noImageIconContainer}>
              <Ionicons
                name="megaphone-outline"
                size={80}
                color="rgba(255,255,255,0.12)"
              />
            </View>
            <AdOverlayContent
              adData={adData}
              colors={colors}
              t={t}
            />
          </View>
        )}

        {/* Glass reflection — fine light edge at top */}
        <View style={styles.glassReflection} />
      </NativeAdView>
    </NativeAd>
  );
}

// ── Overlay (contenu superpose sur l'image/fond) ────────────────────────
function AdOverlayContent({
  adData,
  colors,
  t,
}: {
  adData: any;
  colors: any;
  t: (key: string) => string;
}) {
  return (
    <View style={styles.overlay}>
      {/* ── Ligne du haut: badge Sponsorise + rating ──────────────── */}
      <View style={styles.topRow}>
        <View style={styles.sponsorBadge}>
          <Ionicons name="megaphone" size={10} color="#fff" />
          <Text style={styles.sponsorText}>{t("ad.sponsored")}</Text>
        </View>
        <View style={{ flex: 1 }} />
        {adData?.starRating && adData.starRating > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color="#FFD700" />
            <Text style={styles.ratingText}>
              {adData.starRating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* ── Degrade + infos du bas ────────────────────────────────── */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        style={styles.gradient}
      >
        {/* Headline */}
        <Text style={styles.headline} numberOfLines={2}>
          {adData?.headline ?? ""}
        </Text>

        {/* Bottom row: advertiser + CTA */}
        <View style={styles.bottomRow}>
          <View style={styles.advertiserRow}>
            {adData?.icon?.url && (
              <ImageBackground
                source={{ uri: adData.icon.url }}
                style={styles.advertiserIcon}
                imageStyle={{ borderRadius: 10 }}
              />
            )}
            <Text style={styles.advertiserName} numberOfLines={1}>
              {adData?.advertiser ?? ""}
            </Text>
          </View>
          {adData?.callToAction && (
            <Pressable style={styles.ctaButton}>
              <Text style={styles.ctaText}>{adData.callToAction}</Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

// ###########################################################################
// # Styles — identiques a NewsCard (glass effect iOS-style)
// ###########################################################################

const styles = StyleSheet.create({
  // ── Carte principale ─────────────────────────────────────────────────
  card: {
    height: CARD_HEIGHT,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
    ...(Platform.OS === "web"
      ? ({
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.50), 0 0 0 1.5px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.15)",
        } as any)
      : {}),
  },

  // Glass reflection
  glassReflection: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  // ── Image de fond ───────────────────────────────────────────────────
  imageBg: {
    flex: 1,
  },
  imageStyle: {
    borderRadius: 22,
  },

  // ── Fallback sans image ─────────────────────────────────────────────
  noImageBg: {
    flex: 1,
    borderRadius: 22,
    overflow: "hidden",
  },
  noImageIconContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Overlay ─────────────────────────────────────────────────────────
  overlay: {
    flex: 1,
  },

  // ── Ligne du haut ───────────────────────────────────────────────────
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  sponsorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.50)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  sponsorText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  ratingText: {
    color: "#FFD700",
    fontSize: 11,
    fontWeight: "600",
  },

  // ── Degrade du bas ──────────────────────────────────────────────────
  gradient: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 40,
  },

  // ── Headline (titre de la pub) ──────────────────────────────────────
  headline: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 10,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ── Bottom row ──────────────────────────────────────────────────────
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  advertiserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  advertiserIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  advertiserName: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },

  // ── Bouton CTA ──────────────────────────────────────────────────────
  ctaButton: {
    backgroundColor: "rgba(255,255,255,0.20)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
  },
  ctaText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
