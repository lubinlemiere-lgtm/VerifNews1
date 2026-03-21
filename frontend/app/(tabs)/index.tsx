// ###########################################################################
// # Home Feed — Ecran principal
// # Affiche: stats, chips categories, selecteur periode (recent/mois/annee)
// # quiz hebdo, fil d'articles. Si categorie "politics" selectionnee:
// # bouton pays pour afficher les news du pays choisi en priorite
// ###########################################################################

import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Static Colors removed — dynamic colors via useColors()
import { CATEGORY_BACKGROUNDS } from "@/constants/categoryBackgrounds";
import { useColors } from "@/hooks/useColors";
import { useFeed, useTopFeed } from "@/hooks/useFeed";
import { useCategories } from "@/hooks/useCategories";
import { useTranslation } from "@/hooks/useTranslation";
import { useWeather } from "@/hooks/useWeather";
import { usePreferencesStore } from "@/store/preferencesStore";
import { useDrawerStore } from "@/store/drawerStore";
import { CategoryChip } from "@/components/CategoryChip";
import { CountrySelector } from "@/components/CountrySelector";
import { NewsFeed } from "@/components/NewsFeed";
import { QuizSection } from "@/components/QuizSection";
import { TabBarOverlay } from "@/components/TabBarOverlay";

type FeedMode = "recent" | "month" | "year";

const PERIOD_OPTIONS: { key: FeedMode; labelKey: string; icon: string }[] = [
  { key: "recent", labelKey: "home.recent", icon: "time-outline" },
  { key: "month", labelKey: "home.topMonth", icon: "calendar-outline" },
  { key: "year", labelKey: "home.topYear", icon: "trophy-outline" },
];

// Country code → flag emoji
function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

// ── Date formatting helpers ──────────────────────────────────────────
const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_FR = ["janv.", "fevr.", "mars", "avr.", "mai", "juin", "juil.", "aout", "sept.", "oct.", "nov.", "dec."];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(lang: string): string {
  const d = new Date();
  const days = lang === "fr" ? DAYS_FR : DAYS_EN;
  const months = lang === "fr" ? MONTHS_FR : MONTHS_EN;
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

export default function HomeScreen() {
  const { t, language } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const openDrawer = useDrawerStore((s) => s.open);
  const weather = useWeather();
  const { subscribedSlugs, categories, loadCategories, loadPreferences } =
    useCategories();
  const defaultCategory = usePreferencesStore((s) => s.defaultCategory);
  const [defaultApplied, setDefaultApplied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [feedMode, setFeedMode] = useState<FeedMode>("recent");

  // Appliquer la categorie par defaut au lancement
  useEffect(() => {
    if (defaultApplied) return;
    if (defaultCategory === "all") {
      setSelectedCategory(undefined);
    } else if (defaultCategory === "favorites") {
      // "favorites" = on reste sur "all" mais on filtre visuellement
      setSelectedCategory(undefined);
    } else {
      setSelectedCategory(defaultCategory);
    }
    setDefaultApplied(true);
  }, [defaultCategory, defaultApplied]);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [periodPickerVisible, setPeriodPickerVisible] = useState(false);
  const [showChipsFade, setShowChipsFade] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  // Background image URL for selected category
  const bgUrl = selectedCategory ? CATEGORY_BACKGROUNDS[selectedCategory] : undefined;

  // Animate background in/out on category change
  useEffect(() => {
    Animated.timing(bgOpacity, {
      toValue: bgUrl ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [bgUrl]);

  const selectedCountry = usePreferencesStore((s) => s.selectedCountry);
  const setCountry = usePreferencesStore((s) => s.setCountry);

  // Is the "politics" category currently selected?
  const isPolitics = selectedCategory === "politics";

  useEffect(() => {
    loadCategories();
    loadPreferences();
  }, []);

  // Standard feed (recent) — pass country + priority when politics is selected
  const recentFeed = useFeed({
    category: selectedCategory,
    country: isPolitics ? selectedCountry : undefined,
    countryPriority: isPolitics,
  });

  // Top feed (month or year) — only active when mode is not "recent"
  const topFeed = useTopFeed({
    period: feedMode === "year" ? "year" : "month",
    category: selectedCategory,
    enabled: feedMode !== "recent",
  });

  // Pick the active feed based on mode
  const activeFeed = feedMode === "recent" ? recentFeed : topFeed;

  const displayCategories = categories.filter(
    (c) => subscribedSlugs.length === 0 || subscribedSlugs.includes(c.slug)
  );

  const HEADER_HEIGHT = 52 + (Platform.OS === "web" ? 16 : insets.top);

  const header = (
    <View>
      {/* Category filter chips — sous le header fixe */}
      <View style={{ height: HEADER_HEIGHT }} />
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            setShowChipsFade(contentOffset.x + layoutMeasurement.width < contentSize.width - 8);
          }}
          scrollEventThrottle={16}
        >
          <CategoryChip
            slug="all"
            name={t("home.all")}
            selected={!selectedCategory}
            onPress={() => setSelectedCategory(undefined)}
          />
          {displayCategories.map((cat) => (
            <CategoryChip
              key={cat.id}
              slug={cat.slug}
              name={t("cat." + cat.slug)}
              selected={selectedCategory === cat.slug}
              onPress={() =>
                setSelectedCategory(
                  selectedCategory === cat.slug ? undefined : cat.slug
                )
              }
            />
          ))}
        </ScrollView>
        {showChipsFade && (
          <LinearGradient
            colors={["transparent", colors.background]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.chipsFade}
            pointerEvents="none"
          />
        )}
      </View>

      {/* Country picker — only visible when "politics" category is selected */}
      {isPolitics && (
        <View style={styles.countryRow}>
          <Ionicons name="flag-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.countryLabel, { color: colors.textSecondary }]}>{t("home.countryPicker")}</Text>
          <Pressable
            style={[styles.countryButton, { backgroundColor: colors.surface, borderColor: colors.primary + "40" }]}
            onPress={() => setCountryPickerVisible(true)}
          >
            <Text style={styles.countryFlag}>{countryFlag(selectedCountry)}</Text>
            <Text style={[styles.countryCode, { color: colors.primary }]}>{selectedCountry}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.primary} />
          </Pressable>
        </View>
      )}

      {/* Weekly quiz — compact horizontal scroll */}
      <QuizSection />

      {/* Section title + period dropdown */}
      <View style={styles.sectionHeader}>
        <Ionicons
          name={
            feedMode === "recent"
              ? "pulse"
              : feedMode === "month"
              ? "calendar"
              : "trophy"
          }
          size={16}
          color={colors.primary}
        />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {feedMode === "recent"
            ? t("home.latestNews")
            : feedMode === "month"
            ? t("home.topOfMonth")
            : t("home.topOfYear")}
          {selectedCategory ? ` · ${t("cat." + selectedCategory)}` : ""}
        </Text>
        <View style={{ flex: 1 }} />
        <Pressable
          style={[styles.periodDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setPeriodPickerVisible(true)}
        >
          <Ionicons
            name={
              PERIOD_OPTIONS.find((o) => o.key === feedMode)?.icon as any
            }
            size={13}
            color={colors.primary}
          />
          <Text style={[styles.periodDropdownText, { color: colors.primary }]}>
            {t(PERIOD_OPTIONS.find((o) => o.key === feedMode)?.labelKey ?? "home.recent")}
          </Text>
          <Ionicons name="chevron-down" size={12} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );

  // Header border opacity based on scroll
  const headerBorderOpacity = scrollY.interpolate({
    inputRange: [0, 30],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Brand logo fades out on scroll
  const brandOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // Profile button background fades out on scroll
  const profileBgOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Fond thematique par categorie (image en bas, style wallpaper) ── */}
      {bgUrl && (
        <Animated.View style={[styles.bgImageWrap, { opacity: bgOpacity }]}>
          <Image
            source={{ uri: bgUrl }}
            style={styles.bgImage}
            resizeMode="cover"
          />
          {/* Overlay: sombre en haut (lisibilite), transparent en bas (image visible) */}
          <LinearGradient
            colors={[
              colors.background,
              colors.background + "E6",
              "rgba(0,0,0,0.30)",
              "transparent",
            ]}
            locations={[0, 0.35, 0.65, 1]}
            style={styles.bgOverlay}
          />
        </Animated.View>
      )}

      <NewsFeed
        articles={activeFeed.articles}
        isLoading={activeFeed.isLoading}
        isRefreshing={activeFeed.isRefreshing}
        hasNext={activeFeed.hasNext}
        onRefresh={() => activeFeed.refetch()}
        onLoadMore={() => activeFeed.fetchNextPage()}
        ListHeaderComponent={header}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      />

      {/* ── Header fixe superpose (visuel uniquement) ──────── */}
      <Animated.View
        style={[
          styles.fixedHeader,
          {
            paddingTop: Platform.OS === "web" ? 16 : insets.top,
            height: HEADER_HEIGHT,
            backgroundColor: bgUrl ? "transparent" : colors.background,
            pointerEvents: "none" as const,
          },
        ]}
      >
        <View style={styles.fixedHeaderInner}>
          <Animated.View style={[styles.brandRow, { opacity: brandOpacity }]}>
            <Text style={[styles.dateText, { color: colors.text }]}>
              {formatDate(language)}
            </Text>
            {weather && (
              <View style={styles.weatherPill}>
                <Ionicons name={weather.icon as any} size={14} color={colors.primary} />
                <Text style={[styles.weatherTemp, { color: colors.textSecondary }]}>
                  {weather.temp}°
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
        <Animated.View
          style={[
            styles.headerBorder,
            { backgroundColor: colors.border, opacity: headerBorderOpacity },
          ]}
        />
      </Animated.View>

      {/* ── Bouton profil (couche interactive separee) ──────── */}
      <View
        style={[
          styles.fixedProfileWrap,
          { paddingTop: Platform.OS === "web" ? 16 : insets.top, height: HEADER_HEIGHT },
        ]}
      >
        <Pressable
          testID="profile-btn"
          onPress={openDrawer}
          style={styles.profileBtn}
        >
          <Animated.View
            style={[
              styles.profileBtnBg,
              { backgroundColor: colors.surface, opacity: profileBgOpacity },
            ]}
          />
          <Ionicons name="person" size={16} color={colors.primary} />
        </Pressable>
      </View>

      {/* Country selector modal */}
      <CountrySelector
        visible={countryPickerVisible}
        current={selectedCountry}
        onSelect={(code) => setCountry(code)}
        onClose={() => setCountryPickerVisible(false)}
      />

      {/* Period picker modal */}
      <Modal
        visible={periodPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPeriodPickerVisible(false)}
      >
        <Pressable
          style={styles.periodOverlay}
          onPress={() => setPeriodPickerVisible(false)}
        >
          <View style={[styles.periodMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {PERIOD_OPTIONS.map((opt) => {
              const isActive = feedMode === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.periodMenuItem,
                    isActive && { backgroundColor: colors.primary + "15" },
                  ]}
                  onPress={() => {
                    setFeedMode(opt.key);
                    setPeriodPickerVisible(false);
                  }}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={18}
                    color={isActive ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.periodMenuText,
                      { color: colors.text },
                      isActive && { color: colors.primary, fontWeight: "700" },
                    ]}
                  >
                    {t(opt.labelKey)}
                  </Text>
                  {isActive && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} style={{ marginLeft: "auto" }} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* Frosted glass tab bar overlay */}
      <TabBarOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // ── Fond thematique (image en bas, style wallpaper iPhone) ────────
  bgImageWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    justifyContent: "flex-end",
  },
  bgImage: {
    width: "100%",
    height: "55%",
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  // ── Header fixe ───────────────────────────────────────────────
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  fixedProfileWrap: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 11,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 18,
  },
  fixedHeaderInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  weatherPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    opacity: 0.85,
  },
  weatherTemp: {
    fontSize: 14,
    fontWeight: "600",
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileBtnBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  headerBorder: {
    height: 1,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  chips: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chipsFade: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
  },
  // Country picker row (visible when politics selected)
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  countryLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  countryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  countryFlag: {
    fontSize: 16,
  },
  countryCode: {
    fontSize: 13,
    fontWeight: "700",
  },
  // Section header with period dropdown
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  periodDropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  periodDropdownText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Period picker modal
  periodOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  periodMenu: {
    borderRadius: 16,
    padding: 6,
    width: 220,
    borderWidth: 1,
  },
  periodMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  periodMenuText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
