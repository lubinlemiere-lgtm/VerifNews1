// ###########################################################################
// # Category Onboard — Ecran selection categories apres inscription
// # Plein ecran glassmorphism, selection minimum 1 categorie
// # Les categories choisies apparaissent en priorite dans le feed
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryColors } from "@/constants/colors";
import { CATEGORY_ICONS } from "@/constants/categories";
import { useColors } from "@/hooks/useColors";
import { useCategories } from "@/hooks/useCategories";
import { useTranslation } from "@/hooks/useTranslation";

export default function CategoryOnboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useTranslation();
  const { categories, loadCategories, updateSubscriptions } = useCategories();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleContinue = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await updateSubscriptions(Array.from(selected));
    } catch {
      // Continue anyway — prefs will sync later
    }
    router.replace("/(tabs)");
  };

  const handleSkip = () => {
    router.replace("/(tabs)");
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === "web" ? 48 : insets.top + 16,
          paddingBottom: Platform.OS === "web" ? 32 : insets.bottom + 16,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
          <Ionicons name="grid-outline" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("catOnboard.title")}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t("catOnboard.subtitle")}
        </Text>
      </View>

      {/* Categories grid */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((cat) => {
          const isSelected = selected.has(cat.id);
          const icon = CATEGORY_ICONS[cat.slug] || "ellipse-outline";
          const catColor = CategoryColors[cat.slug] || colors.primary;

          return (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isSelected ? catColor : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
                isSelected && {
                  backgroundColor: catColor + "12",
                },
                // Glass shadow on web
                Platform.OS === "web"
                  ? ({
                      boxShadow: isSelected
                        ? `0 4px 20px ${catColor}30, 0 0 0 1px ${catColor}40`
                        : "0 2px 8px rgba(0,0,0,0.15)",
                    } as any)
                  : {},
              ]}
              onPress={() => toggle(cat.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <View
                style={[
                  styles.catIconCircle,
                  { backgroundColor: catColor + "20" },
                ]}
              >
                <Ionicons name={icon as any} size={22} color={catColor} />
              </View>

              <Text
                style={[
                  styles.catName,
                  { color: isSelected ? catColor : colors.text },
                ]}
              >
                {t(`cat.${cat.slug}`)}
              </Text>

              {/* Check indicator */}
              <View
                style={[
                  styles.checkCircle,
                  {
                    backgroundColor: isSelected ? catColor : colors.surfaceLight,
                    borderColor: isSelected ? catColor : colors.border,
                  },
                ]}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Footer buttons */}
      <View style={styles.footer}>
        {/* Minimum hint */}
        {selected.size === 0 && (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {t("catOnboard.min")}
          </Text>
        )}

        {/* Continue button */}
        <Pressable
          style={[
            styles.continueBtn,
            {
              backgroundColor: selected.size > 0 ? colors.primary : colors.border,
            },
          ]}
          onPress={handleContinue}
          disabled={selected.size === 0 || saving}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.continueBtnText,
              {
                color: selected.size > 0 ? colors.background : colors.textMuted,
              },
            ]}
          >
            {saving ? "..." : t("catOnboard.continue")}
          </Text>
          {!saving && (
            <Ionicons
              name="arrow-forward"
              size={18}
              color={selected.size > 0 ? colors.background : colors.textMuted}
            />
          )}
        </Pressable>

        {/* Skip button */}
        <Pressable
          style={styles.skipBtn}
          onPress={handleSkip}
          accessibilityRole="button"
        >
          <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>
            {t("catOnboard.skip")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ###########################################################################
// # Styles
// ###########################################################################

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingBottom: 16,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 22,
    gap: 14,
    // Shadow native
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  catIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  catName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    alignItems: "center",
    paddingTop: 12,
    gap: 10,
  },
  hint: {
    fontSize: 12,
    fontWeight: "500",
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
