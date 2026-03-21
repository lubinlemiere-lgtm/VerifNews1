// ###########################################################################
// # NewsCard — Carte widget immersive (image plein cadre + overlay)
// # Design: image de fond, degrade sombre, texte superpose
// # Variante featured (1er article) = plus grand
// # Fallback sans image = fond couleur categorie + icone
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { CategoryColors } from "@/constants/colors";
import { CATEGORY_ICONS } from "@/constants/categories";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import type { ArticleListItem } from "@/types/article";
import { useReactionStore } from "@/store/reactionStore";
import { useAuthStore } from "@/store/authStore";
import { AuthGateModal } from "@/components/ui/AuthGateModal";
import { useBookmarkStore } from "@/store/bookmarkStore";
import { lightHaptic } from "@/utils/haptics";
import { shareArticle } from "@/utils/sharing";
import { useTextSizeStore } from "@/store/textSizeStore";

// ── Dimensions ──────────────────────────────────────────────────────────
const CARD_HEIGHT_FEATURED = 300;
const CARD_HEIGHT_REGULAR = 200;

// ── Props ───────────────────────────────────────────────────────────────
interface NewsCardProps {
  article: ArticleListItem;
  isFeatured?: boolean;
}

// ── Temps relatif (reutilise du composant precedent) ────────────────────
function useTimeAgo() {
  const { t } = useTranslation();
  return (dateStr: string | null): string => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t("card.justNow");
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  };
}

// ── Temps de lecture estime ─────────────────────────────────────────────
function getReadingTime(text: string | null): number {
  if (!text) return 1;
  const wordCount = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

// ── Composant principal ─────────────────────────────────────────────────
function NewsCardInner({ article, isFeatured = false }: NewsCardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useColors();
  const timeAgo = useTimeAgo();
  const [menuVisible, setMenuVisible] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const { getReaction, setReaction } = useReactionStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isBookmarked, toggleBookmark } = useBookmarkStore();
  const reaction = getReaction(article.id);
  const saved = isBookmarked(article.id);
  const getScaled = useTextSizeStore((s) => s.getScaled);

  const cardHeight = isFeatured ? CARD_HEIGHT_FEATURED : CARD_HEIGHT_REGULAR;

  // Icone + couleur de la categorie
  const catIcon = article.category_slug
    ? CATEGORY_ICONS[article.category_slug] || "ellipse-outline"
    : "ellipse-outline";
  const catColor = article.category_slug
    ? CategoryColors[article.category_slug] || colors.primary
    : colors.primary;

  // ── Contenu overlay (identique avec ou sans image) ──────────────────
  const overlayContent = (
    <View style={[styles.overlay, { height: cardHeight }]}>
      {/* Ligne du haut: badge categorie + menu 3 points */}
      <View style={styles.topRow}>
        {article.category_slug && (
          <View style={styles.categoryBadge}>
            <Ionicons name={catIcon as any} size={11} color="#fff" />
            <Text style={styles.categoryText}>
              {t("cat." + article.category_slug)}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            setMenuVisible(true);
          }}
          hitSlop={12}
          style={styles.menuBtn}
        >
          <Ionicons name="ellipsis-vertical" size={16} color="#fff" />
        </Pressable>
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Degrade + infos du bas */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        style={styles.gradient}
      >
        <Text
          style={[
            styles.title,
            { fontSize: getScaled(16), lineHeight: getScaled(22) },
            isFeatured && { fontSize: getScaled(20), lineHeight: getScaled(27), fontWeight: "800" },
          ]}
          numberOfLines={isFeatured ? 3 : 2}
        >
          {article.title}
        </Text>

        <View style={styles.bottomRow}>
          <View style={styles.infoLeft}>
            {article.is_verified && (
              <>
                <Ionicons name="shield-checkmark" size={12} color={colors.verified} />
                <Text style={styles.infoText}>
                  {article.verification_count}{" "}
                  {article.verification_count > 1
                    ? t("proof.sources")
                    : t("proof.source")}
                </Text>
                <Text style={styles.infoDot}>&middot;</Text>
              </>
            )}
            <Text style={styles.infoText}>{timeAgo(article.published_at)}</Text>
            <Text style={styles.infoDot}>&middot;</Text>
            <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.65)" />
            <Text style={styles.infoText}>
              {getReadingTime(article.summary)} min
            </Text>
          </View>
          <View style={styles.infoRight}>
            {reaction && (
              <Ionicons
                name={reaction === "like" ? "thumbs-up" : "thumbs-down"}
                size={12}
                color="#fff"
              />
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  // ── Rendu de la carte ───────────────────────────────────────────────
  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { height: cardHeight, borderColor: catColor + "50" },
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push(`/article/${article.id}`)}
      >
        {/* Glass glow — subtle halo behind the card */}
        <View style={[styles.glassGlow, { shadowColor: catColor }]} />

        {article.image_url ? (
          // Carte avec image
          <ImageBackground
            source={{ uri: article.image_url }}
            style={styles.imageBg}
            imageStyle={styles.imageStyle}
            resizeMode="cover"
          >
            {overlayContent}
          </ImageBackground>
        ) : (
          // Fallback sans image — fond couleur categorie
          <View style={[styles.noImageBg, { backgroundColor: catColor }]}>
            {/* Icone decorative en arriere-plan */}
            <View style={styles.noImageIconContainer}>
              <Ionicons
                name={catIcon as any}
                size={80}
                color="rgba(255,255,255,0.12)"
              />
            </View>
            {overlayContent}
          </View>
        )}

        {/* Glass reflection — fine light edge at top */}
        <View style={styles.glassReflection} />
      </Pressable>

      {/* ── AuthGate — Modal connexion requise ──────────────────────── */}
      <AuthGateModal
        visible={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        feature="like"
      />

      {/* ── Modal menu — Like / Dislike / Voir sources ─────────────── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View
            style={[
              styles.menu,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {/* Boutons Like / Dislike */}
            <View style={styles.reactionRow}>
              <Pressable
                style={[styles.reactionBtn, reaction === "like" && { backgroundColor: colors.primary + "20" }]}
                onPress={() => {
                  if (!isAuthenticated) {
                    setMenuVisible(false);
                    setShowAuthGate(true);
                    return;
                  }
                  lightHaptic();
                  setReaction(article.id, "like");
                  setMenuVisible(false);
                }}
              >
                <Ionicons
                  name={reaction === "like" ? "thumbs-up" : "thumbs-up-outline"}
                  size={22}
                  color={colors.text}
                />
              </Pressable>

              <Pressable
                style={[styles.reactionBtn, reaction === "dislike" && { backgroundColor: colors.danger + "20" }]}
                onPress={() => {
                  if (!isAuthenticated) {
                    setMenuVisible(false);
                    setShowAuthGate(true);
                    return;
                  }
                  lightHaptic();
                  setReaction(article.id, "dislike");
                  setMenuVisible(false);
                }}
              >
                <Ionicons
                  name={reaction === "dislike" ? "thumbs-down" : "thumbs-down-outline"}
                  size={22}
                  color={colors.text}
                />
              </Pressable>

              <Pressable
                style={[styles.reactionBtn, saved && { backgroundColor: colors.warning + "20" }]}
                onPress={() => {
                  if (!isAuthenticated) {
                    setMenuVisible(false);
                    setShowAuthGate(true);
                    return;
                  }
                  lightHaptic();
                  toggleBookmark({
                    id: article.id,
                    title: article.title,
                    summary: article.summary,
                    image_url: article.image_url,
                    category_slug: article.category_slug,
                    published_at: article.published_at,
                    is_verified: article.is_verified,
                    verification_count: article.verification_count,
                    has_audio: article.has_audio,
                  });
                  setMenuVisible(false);
                }}
              >
                <Ionicons
                  name={saved ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color={saved ? colors.warning : colors.text}
                />
              </Pressable>
            </View>

            <View
              style={[styles.menuSeparator, { backgroundColor: colors.border }]}
            />

            {/* Bouton Voir sources — icone seule */}
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push(`/article/${article.id}`);
              }}
            >
              <Ionicons
                name="document-text-outline"
                size={22}
                color={colors.text}
              />
            </Pressable>

            <View
              style={[styles.menuSeparator, { backgroundColor: colors.border }]}
            />

            {/* Bouton Partager — icone seule */}
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                shareArticle({
                  articleId: article.id,
                  title: article.title,
                  summary: article.summary,
                  sharedViaText: t("article.sharedVia"),
                });
              }}
            >
              <Ionicons
                name="share-outline"
                size={22}
                color={colors.text}
              />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ── React.memo pour performance ─────────────────────────────────────────
export const NewsCard = React.memo(NewsCardInner);

// ###########################################################################
// # Styles
// ###########################################################################

const styles = StyleSheet.create({
  // ── Carte principale — glass effect iOS-style ────────────────────────
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 22,
    overflow: "hidden",
    // Glass border — luminous edge (more visible)
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    // Shadow + glow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
    // Web-specific glow — enhanced for iOS look
    ...(Platform.OS === "web"
      ? ({
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.50), 0 0 0 1.5px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 60px rgba(0,0,0,0.20)",
        } as any)
      : {}),
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  // Glass glow — colored halo behind the card
  glassGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 0,
  },
  // Glass reflection — bright highlight at the top edge (iOS-style)
  glassReflection: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  // ── Image de fond ─────────────────────────────────────────────────────
  imageBg: {
    flex: 1,
  },
  imageStyle: {
    borderRadius: 22,
  },

  // ── Fallback sans image ───────────────────────────────────────────────
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

  // ── Overlay (couvre toute la carte) ───────────────────────────────────
  overlay: {
    flex: 1,
  },

  // ── Ligne du haut ─────────────────────────────────────────────────────
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  menuBtn: {
    padding: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
  },

  // ── Degrade du bas ────────────────────────────────────────────────────
  gradient: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 40,
  },

  // ── Titre ─────────────────────────────────────────────────────────────
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  titleFeatured: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 27,
  },

  // ── Infos du bas ──────────────────────────────────────────────────────
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  infoRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  likeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  likeText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "600",
  },
  infoText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "500",
  },
  infoDot: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },

  // ── Modal menu ────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menu: {
    borderRadius: 16,
    padding: 8,
    width: 240,
    borderWidth: 1,
  },
  reactionRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  reactionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  menuSeparator: {
    height: 1,
    marginHorizontal: 16,
  },
});
