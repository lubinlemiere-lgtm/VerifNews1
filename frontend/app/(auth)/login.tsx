// ###########################################################################
// # Login — Ecran de connexion (modal)
// # Email + mot de passe, lien vers inscription
// # Erreurs affichees en bandeau rouge (pas de Alert.alert sur web)
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/Button";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useTranslation();
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // ── Validation et connexion ───────────────────────────────────────
  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError(t("login.fillFields"));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      setError(t("login.invalidEmail"));
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err?.response?.data?.detail || t("login.invalid"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Logo ─────────────────────────────────────────────────── */}
        <View style={styles.brand}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="shield-checkmark" size={32} color="#fff" />
          </View>
          <Text style={[styles.logo, { color: colors.text }]}>VerifNews</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t("login.subtitle")}
          </Text>
        </View>

        {/* ── Bandeau erreur ───────────────────────────────────────── */}
        {error !== "" && (
          <View style={[styles.errorBanner, { backgroundColor: colors.danger + "18" }]}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {/* ── Formulaire ───────────────────────────────────────────── */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("login.email")}
            </Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: colors.surface, borderColor: error && !email ? colors.danger : colors.border },
            ]}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t("login.emailPlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("login.password")}
            </Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: colors.surface, borderColor: error && !password ? colors.danger : colors.border },
            ]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t("login.passwordPlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(""); }}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          <Button title={t("login.signIn")} onPress={handleLogin} loading={loading} />

          <Pressable
            onPress={() => router.push("/(auth)/forgot-password")}
            style={styles.forgotLink}
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>
              {t("login.forgotPassword")}
            </Text>
          </Pressable>
        </View>

        {/* ── Lien inscription ─────────────────────────────────────── */}
        <Link href="/(auth)/register" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>
            {t("login.noAccount")}{" "}
            <Text style={[styles.linkBold, { color: colors.primary }]}>{t("login.signUp")}</Text>
          </Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ###########################################################################
// # Styles
// ###########################################################################

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  brand: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logo: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  // ── Bandeau erreur ──────────────────────────────────────────────────
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  // ── Formulaire ──────────────────────────────────────────────────────
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    paddingLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    outlineWidth: 0,
  },
  link: {
    marginTop: 28,
    alignSelf: "center",
  },
  linkText: {
    fontSize: 14,
  },
  linkBold: {
    fontWeight: "700",
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: 8,
    padding: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
