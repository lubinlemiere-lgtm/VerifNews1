// ###########################################################################
// # Forgot Password — Ecran de reset mot de passe
// # Etape 1: Saisir email → API envoie un lien de reset
// # Etape 2: Confirmation + retour login
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { authApi } from "@/services/authApi";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert(t("forgot.error"), t("forgot.emailRequired"));
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      Alert.alert(t("forgot.error"), t("register.invalidEmail"));
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch {
      // Always show success to prevent email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  // Confirmation screen after sending
  if (sent) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.success + "20" }]}>
            <Ionicons name="mail-open-outline" size={48} color={colors.success} />
          </View>
          <Text style={[styles.sentTitle, { color: colors.text }]}>
            {t("forgot.sentTitle")}
          </Text>
          <Text style={[styles.sentDesc, { color: colors.textSecondary }]}>
            {t("forgot.sentDesc")}
          </Text>
          <Text style={[styles.sentEmail, { color: colors.primary }]}>
            {email}
          </Text>

          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={styles.backBtnText}>{t("forgot.backToLogin")}</Text>
          </Pressable>

          <Pressable
            style={styles.resendLink}
            onPress={() => {
              setSent(false);
              setEmail("");
            }}
          >
            <Text style={[styles.resendText, { color: colors.textMuted }]}>
              {t("forgot.resend")}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Email input screen
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        {/* Back button */}
        <Pressable
          style={styles.closeBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="key-outline" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("forgot.title")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t("forgot.subtitle")}
          </Text>
        </View>

        {/* Email input */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("login.email")}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t("login.emailPlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
              />
            </View>
          </View>

          <Button
            title={t("forgot.send")}
            onPress={handleSubmit}
            loading={loading}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  closeBtn: {
    position: "absolute",
    top: 56,
    left: 28,
    padding: 6,
    zIndex: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
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
  // Sent confirmation
  sentTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  sentDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 4,
  },
  sentEmail: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 32,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  backBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  resendLink: {
    alignSelf: "center",
    marginTop: 20,
    padding: 8,
  },
  resendText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
