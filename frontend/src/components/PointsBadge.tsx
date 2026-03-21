// ###########################################################################
// # PointsBadge — Badge anime flottant "+5 pts"
// # Apparait brievement quand des points sont gagnes, puis disparait
// # Scale-in + fade-out avec l'API Animated de React Native
// ###########################################################################

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";

interface PointsBadgeProps {
  points: number;
  visible: boolean;
  onHide: () => void;
}

export function PointsBadge({ points, visible, onHide }: PointsBadgeProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && points > 0) {
      // Reset
      scale.setValue(0);
      opacity.setValue(0);

      // Scale-in + fade-in
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 100,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Rester visible 1.5s puis fade-out
        setTimeout(() => {
          Animated.timing(opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }).start(() => {
            onHide();
          });
        }, 1500);
      });
    }
  }, [visible, points]);

  if (!visible || points <= 0) return null;

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          backgroundColor: colors.primary,
          opacity,
          transform: [{ scale }],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>
        +{points} {t("gamification.pts")}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  text: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});
