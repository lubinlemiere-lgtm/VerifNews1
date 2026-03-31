// ###########################################################################
// # AuthGateModal — Modal glassmorphism pour bloquer les actions guest
// # S'affiche quand un utilisateur non connecte tente une action restreinte
// # (like, bookmark, quiz). Propose de creer un compte ou se connecter.
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useThemeStore } from "@/store/themeStore";
import { useTranslation } from "@/hooks/useTranslation";

// ── Props ───────────────────────────────────────────────────────────────
type AuthGateFeature = "like" | "bookmark" | "quiz";

interface AuthGateModalProps {
  visible: boolean;
  onClose: () => void;
  feature: AuthGateFeature;
}

// ── Icone par feature ───────────────────────────────────────────────────
const FEATURE_ICONS: Record<AuthGateFeature, keyof typeof Ionicons.glyphMap> = {
  like: "heart-outline",
  bookmark: "bookmark-outline",
  quiz: "game-controller-outline",
};

// ── Composant ───────────────────────────────────────────────────────────
export function AuthGateModal({ visible, onClose, feature }: AuthGateModalProps) {
  const router = useRouter();
  const colors = useColors();
  const isDark = useThemeStore((s) => s.mode) === "dark";
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          damping: 18,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(0.85);
      opacity.setValue(0);
    }
  }, [visible]);

  const goRegister = () => {
    onClose();
    router.push("/(auth)/register");
  };

  const goLogin = () => {
    onClose();
    router.push("/(auth)/login");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Inner Pressable captures touches to prevent overlay close when tapping the card */}
        <Pressable>
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                transform: [{ scale }],
                opacity,
                // Glass shadow
                ...(Platform.OS === "web"
                  ? ({
                      boxShadow: isDark
                        ? "0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1)"
                        : "0 12px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
                    } as any)
                  : {}),
              },
            ]}
          >
          {/* Close button */}
          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("country.close")}
          >
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>

          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons
              name={FEATURE_ICONS[feature]}
              size={32}
              color={colors.primary}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {t("authGate.title")}
          </Text>

          {/* Description */}
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            {t(`authGate.${feature}`)}
          </Text>

          {/* Primary CTA — Register */}
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={goRegister}
            accessibilityRole="button"
          >
            <Ionicons name="person-add-outline" size={18} color={colors.background} />
            <Text style={[styles.primaryBtnText, { color: colors.background }]}>
              {t("authGate.register")}
            </Text>
          </Pressable>

          {/* Secondary CTA — Login */}
          <Pressable
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={goLogin}
            accessibilityRole="button"
          >
            <Ionicons name="log-in-outline" size={18} color={colors.text} />
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
              {t("authGate.login")}
            </Text>
          </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ###########################################################################
// # Styles
// ###########################################################################

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 22,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    // Shadow native
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 16,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    padding: 6,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    marginTop: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
