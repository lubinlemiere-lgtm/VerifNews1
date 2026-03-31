// ###########################################################################
// # Article Detail — Affichage complet d'un article
// # Titre, image, resume, contenu, badge verification, sources, partage
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryColors } from "@/constants/colors";
import { CATEGORY_ICONS } from "@/constants/categories";
import { useColors } from "@/hooks/useColors";
import { useArticle } from "@/hooks/useArticle";
import { useBookmarkStore } from "@/store/bookmarkStore";
import { useTranslation } from "@/hooks/useTranslation";
import { AudioPlayer } from "@/components/AudioPlayer";
import { ProofBadge } from "@/components/ProofBadge";
import { SourceList } from "@/components/SourceList";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { AuthGateModal } from "@/components/ui/AuthGateModal";
import { useAuthStore } from "@/store/authStore";
import { lightHaptic } from "@/utils/haptics";
import { shareArticle } from "@/utils/sharing";
import { useTextSizeStore } from "@/store/textSizeStore";
import { useGamificationStore } from "@/store/gamificationStore";
import { usePreferencesStore } from "@/store/preferencesStore";

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { article, isLoading, error, refetch } = useArticle(id);
  const isBookmarked = useBookmarkStore((s) => s.isBookmarked);
  const toggleBookmark = useBookmarkStore((s) => s.toggleBookmark);
  const { t, language } = useTranslation();
  const colors = useColors();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const getScaled = useTextSizeStore((s) => s.getScaled);
  const markArticleRead = useGamificationStore((s) => s.markArticleRead);
  const ttsEnabled = usePreferencesStore((s) => s.ttsEnabled);

  // Marquer l'article comme lu quand il est charge
  useEffect(() => {
    if (article && id) {
      markArticleRead(id);
    }
  }, [article, id]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!article) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: Platform.OS === "web" ? 16 : insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("article.header")}</Text>
          <View style={{ width: 34 }} />
        </View>
        {error ? (
          <ErrorRetry onRetry={() => refetch()} />
        ) : (
          <View style={styles.notFoundBody}>
            <Ionicons name="document-text-outline" size={56} color={colors.textMuted} />
            <Text style={[styles.notFoundTitle, { color: colors.text }]}>
              {t("article.notFound")}
            </Text>
            <Text style={[styles.notFoundDesc, { color: colors.textSecondary }]}>
              {t("article.notFoundDesc")}
            </Text>
          </View>
        )}
      </View>
    );
  }

  const saved = isBookmarked(article.id);
  const catIcon = article.category_slug
    ? CATEGORY_ICONS[article.category_slug] || "ellipse-outline"
    : "ellipse-outline";
  const catColor = article.category_slug
    ? CategoryColors[article.category_slug] || colors.primary
    : colors.primary;

  const handleShare = () => {
    shareArticle({
      articleId: article.id,
      title: article.title,
      summary: article.summary ?? undefined,
      originalUrl: article.original_url ?? undefined,
      sharedViaText: t("article.sharedVia"),
    });
  };

  const handleBookmark = () => {
    if (!isAuthenticated) {
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
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with back, bookmark, share */}
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: Platform.OS === "web" ? 16 : insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {t("article.header")}
        </Text>
        <View style={styles.headerActions}>
          <Pressable onPress={handleBookmark} style={styles.headerBtn} hitSlop={8}>
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={22}
              color={saved ? colors.warning : colors.text}
            />
          </Pressable>
          <Pressable onPress={handleShare} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="share-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {article.image_url && (
          <Image source={{ uri: article.image_url }} style={styles.image} contentFit="cover" transition={300} />
        )}

        <View style={styles.body}>
          <View style={styles.meta}>
            {article.category_slug && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Ionicons name={catIcon as any} size={14} color={catColor} />
                <Text style={[styles.category, { color: catColor }]}>
                  {article.category_slug.replace("_", " / ")}
                </Text>
              </View>
            )}
            <ProofBadge
              verificationCount={article.verification_count}
              isVerified={article.is_verified}
            />
          </View>

          <Text style={[styles.title, { color: colors.text, fontSize: getScaled(24), lineHeight: getScaled(30) }]}>{article.title}</Text>

          {article.primary_source && (
            <Text style={[styles.source, { color: colors.accent }]}>
              {t("article.source")} {article.primary_source.name}
            </Text>
          )}

          {article.published_at && (
            <Text style={[styles.date, { color: colors.textMuted }]}>
              {new Date(article.published_at).toLocaleDateString(
                language === "fr" ? "fr-FR" : "en-US",
                { year: "numeric", month: "long", day: "numeric" }
              )}
            </Text>
          )}

          {ttsEnabled && <AudioPlayer articleId={article.id} />}

          {article.summary && (
            <View style={[styles.summaryBox, { backgroundColor: colors.surfaceLight, borderLeftColor: colors.primary }]}>
              <Text style={[styles.summaryLabel, { color: colors.primary }]}>{t("article.summary")}</Text>
              <Text style={[styles.summary, { color: colors.text, fontSize: getScaled(15), lineHeight: getScaled(22) }]}>{article.summary}</Text>
            </View>
          )}

          {article.content && (
            <Text style={[styles.contentText, { color: colors.textSecondary, fontSize: getScaled(15), lineHeight: getScaled(24) }]}>{article.content}</Text>
          )}

          <SourceList verifications={article.verifications} />

          {article.original_url && (
            <Pressable
              style={[styles.readMore, { backgroundColor: colors.surfaceLight }]}
              onPress={() => Linking.openURL(article.original_url!)}
            >
              <Text style={[styles.readMoreText, { color: colors.primary }]}>{t("article.readOriginal")}</Text>
              <Ionicons name="open-outline" size={16} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* AuthGate — Modal connexion requise pour bookmark */}
      <AuthGateModal
        visible={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        feature="bookmark"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: {
    padding: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: "row",
    gap: 4,
  },
  content: {
    paddingBottom: 40,
  },
  image: {
    width: "100%",
    height: 220,
  },
  body: {
    padding: 16,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  category: {
    fontSize: 13,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    marginBottom: 8,
  },
  source: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryBox: {
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderLeftWidth: 3,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  summary: {
    fontSize: 15,
    lineHeight: 22,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 16,
  },
  readMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
  notFoundBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
  },
  notFoundDesc: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
});
