// ###########################################################################
// # Register — Ecran d'inscription (modal)
// # Nom (optionnel) + email + mot de passe + toggle visibilite
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

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { t } = useTranslation();
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // ── Validation et inscription ─────────────────────────────────────
  const handleRegister = async () => {
    setError("");

    if (!email || !password) {
      setError(t("register.required"));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      setError(t("register.invalidEmail"));
      return;
    }
    if (password.length < 8) {
      setError(t("register.passwordTooShort"));
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError(t("register.passwordWeak"));
      return;
    }

    setLoading(true);
    try {
      await register(email, password, displayName || undefined);
      router.replace("/category-onboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || t("register.generic"));
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
            {t("register.subtitle")}
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
          {/* Nom */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("register.displayName")}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t("register.displayName")}
                placeholderTextColor={colors.textMuted}
                value={displayName}
                onChangeText={(v) => { setDisplayName(v); setError(""); }}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("register.email")}
            </Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: colors.surface, borderColor: error && !email ? colors.danger : colors.border },
            ]}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t("register.email")}
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("register.password")}
            </Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: colors.surface, borderColor: error && !password ? colors.danger : colors.border },
            ]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t("register.password")}
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
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {t("register.passwordHint")}
            </Text>
          </View>

          <Button title={t("register.create")} onPress={handleRegister} loading={loading} />
        </View>

        {/* ── Lien connexion ───────────────────────────────────────── */}
        <Link href="/(auth)/login" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>
            {t("register.hasAccount")}{" "}
            <Text style={[styles.linkBold, { color: colors.primary }]}>{t("register.login")}</Text>
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
    textAlign: "center",
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
    // @ts-ignore — supprime l'outline orange sur web
    outlineStyle: "none",
  },
  hint: {
    fontSize: 11,
    paddingLeft: 4,
    marginTop: 2,
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
});
