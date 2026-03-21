// ###########################################################################
// # WelcomeSplash — Animation d'accueil pour utilisateurs connectes
// # Affiche: logo anime → "Bonjour {nom}" → fondu sortie
// # Duree totale ~2.5s puis appelle onDone()
// ###########################################################################

import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";

type Props = {
  displayName: string | null;
  onDone: () => void;
};

export function WelcomeSplash({ displayName, onDone }: Props) {
  const colors = useColors();
  const { t } = useTranslation();

  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const greetOpacity = useRef(new Animated.Value(0)).current;
  const greetTranslateY = useRef(new Animated.Value(12)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  const name = displayName || t("welcome.defaultName");

  useEffect(() => {
    // Phase 1: Logo appears (scale + fade in)
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Phase 2: Greeting slides up + fades in
      Animated.parallel([
        Animated.timing(greetOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(greetTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Phase 3: Hold briefly, then fade everything out
        setTimeout(() => {
          Animated.timing(screenOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }).start(() => onDone());
        }, 800);
      });
    });
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.background, opacity: screenOpacity },
      ]}
    >
      {/* Logo */}
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={[styles.logoCircle, { backgroundColor: colors.primary + "20" }]}>
          <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.appName, { color: colors.text }]}>
          Verif<Text style={{ color: colors.primary }}>News</Text>
        </Text>
      </Animated.View>

      {/* Greeting */}
      <Animated.View
        style={[
          styles.greetWrap,
          {
            opacity: greetOpacity,
            transform: [{ translateY: greetTranslateY }],
          },
        ]}
      >
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>
          {t("welcome.hello")}
        </Text>
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    alignItems: "center",
    gap: 12,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  greetWrap: {
    alignItems: "center",
    marginTop: 32,
    gap: 4,
  },
  greeting: {
    fontSize: 16,
    fontWeight: "500",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
  },
});
