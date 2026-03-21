// ###########################################################################
// # Categories — Selection des centres d'interet
// # Toggle ON/OFF par categorie, sauvegarde via API preferences
// ###########################################################################

import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { CategoryColors } from "@/constants/colors";
import { CATEGORY_ICONS } from "@/constants/categories";
import { useCategories } from "@/hooks/useCategories";
import { useTranslation } from "@/hooks/useTranslation";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { TabBarOverlay } from "@/components/TabBarOverlay";

export default function CategoriesScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { categories, preferences, loadCategories, loadPreferences, updateSubscriptions } =
    useCategories();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
    loadPreferences();
  }, []);

  useEffect(() => {
    const subscribedIds = preferences.filter((p) => p.is_subscribed).map((p) => p.category_id);
    setSelected(new Set(subscribedIds));
  }, [preferences]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSubscriptions(Array.from(selected));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={[styles.title, { color: colors.text }]}>{t("categories.title")}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t("categories.subtitle")}
        </Text>

        {categories.map((cat) => {
          const color = CategoryColors[cat.slug] || colors.primary;
          const icon = CATEGORY_ICONS[cat.slug] || "ellipse-outline";
          const isSelected = selected.has(cat.id);

          return (
            <Pressable
              key={cat.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: isSelected ? color : colors.border }]}
              onPress={() => toggle(cat.id)}
            >
              <View style={styles.cardContent}>
                <View style={[styles.iconBox, { backgroundColor: color + "20" }]}>
                  <Ionicons name={icon as any} size={24} color={color} />
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{cat.name}</Text>
                  {cat.description && (
                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{cat.description}</Text>
                  )}
                </View>
                <Switch
                  value={isSelected}
                  onValueChange={() => toggle(cat.id)}
                  trackColor={{ true: color, false: colors.surfaceLight }}
                  thumbColor={colors.text}
                />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Button title={t("categories.save")} onPress={handleSave} loading={saving} />
      </View>

      {/* Frosted glass tab bar overlay */}
      <TabBarOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  card: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
});
