// ###########################################################################
// # ErrorBoundary — Attrape les erreurs de rendu React
// # Affiche un ecran de secours avec bouton "Reessayer"
// # Wrapper fonctionnel pour injecter useColors() et useTranslation()
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import React, { Component } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";

// ── Types ─────────────────────────────────────────────────────────────────
interface ThemeColors {
  background: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  danger: string;
  surface: string;
  border: string;
}

interface ErrorBoundaryClassProps {
  children: React.ReactNode;
  colors: ThemeColors;
  t: (key: string) => string;
}

interface ErrorBoundaryClassState {
  hasError: boolean;
}

// ── Class component (requis pour componentDidCatch) ───────────────────────
class ErrorBoundaryClass extends Component<
  ErrorBoundaryClassProps,
  ErrorBoundaryClassState
> {
  constructor(props: ErrorBoundaryClassProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryClassState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      const { colors, t } = this.props;

      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons
              name="warning-outline"
              size={48}
              color={colors.danger}
              style={styles.icon}
            />

            <Text style={[styles.title, { color: colors.text }]}>
              {t("error.title")}
            </Text>

            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {t("error.message")}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                { backgroundColor: colors.primary },
                pressed && styles.retryButtonPressed,
              ]}
              onPress={this.handleRetry}
            >
              <Ionicons name="refresh-outline" size={18} color={colors.background} />
              <Text style={[styles.retryText, { color: colors.background }]}>
                {t("error.retry")}
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// ── Wrapper fonctionnel — injecte les couleurs et traductions ─────────────
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const colors = useColors();
  const { t } = useTranslation();

  return (
    <ErrorBoundaryClass colors={colors} t={t}>
      {children}
    </ErrorBoundaryClass>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    alignItems: "center",
    padding: 32,
    borderRadius: 22,
    borderWidth: 1,
    width: "100%",
    maxWidth: 340,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  retryText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
