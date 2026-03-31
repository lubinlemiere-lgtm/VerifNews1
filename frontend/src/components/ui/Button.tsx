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
  disabled?: boolean;
}

export function Button({
  title,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  ...props
}: ButtonProps) {
  const colors = useColors();
  const isDisabled = loading || disabled;
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
      style={[
        styles.button,
        { backgroundColor: bgColor, borderColor },
        isDisabled && { opacity: 0.5 },
        style as any,
      ]}
      disabled={isDisabled}
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
    outlineWidth: 0,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
});
