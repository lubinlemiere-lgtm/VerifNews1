import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { CategoryColors } from "@/constants/colors";
import { CATEGORY_ICONS } from "@/constants/categories";
import { useColors } from "@/hooks/useColors";

interface CategoryChipProps {
  slug: string;
  name?: string;
  selected?: boolean;
  onPress?: () => void;
}

export function CategoryChip({ slug, name, selected, onPress }: CategoryChipProps) {
  const colors = useColors();
  const color = CategoryColors[slug] || colors.primary;
  const icon = CATEGORY_ICONS[slug] || "ellipse-outline";
  const selectedFg = slug === "all" ? colors.background : "#fff";

  return (
    <Pressable
      style={[
        styles.chip,
        { borderColor: color, backgroundColor: colors.surfaceLight },
        selected && { backgroundColor: color },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={14} color={selected ? selectedFg : color} />
      {name && (
        <Text style={[styles.text, { color: colors.text }, selected && { color: selectedFg, fontWeight: "700" }]}>
          {name}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  text: {
    fontSize: 13,
    fontWeight: "500",
  },
});
