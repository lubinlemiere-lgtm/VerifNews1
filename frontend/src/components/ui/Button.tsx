import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface ButtonProps extends PressableProps {
  title: string;
  variant?: "primary" | "secondary" | "outline";
  loading?: boolean;
}

export function Button({
  title,
  variant = "primary",
  loading = false,
  style,
  ...props
}: ButtonProps) {
  const colors = useColors();
  const bgColor =
    variant === "primary"
      ? colors.primary
      : variant === "secondary"
        ? colors.surfaceLight
        : "transparent";
  const borderColor = variant === "outline" ? colors.primary : bgColor;
  const textColor =
    variant === "outline"
      ? colors.primary
      : variant === "primary"
        ? "#FFFFFF"
        : "#fff";

  return (
    <Pressable
      style={[styles.button, { backgroundColor: bgColor, borderColor }, style as any]}
      disabled={loading}
      accessibilityRole="button"
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    // @ts-ignore — supprime l'outline orange sur web
    outlineStyle: "none",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
});
