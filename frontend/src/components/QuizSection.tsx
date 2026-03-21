// ###########################################################################
// # QuizSection — Scroll horizontal des quiz de la semaine
// # Charge les quiz depuis l'API, affiche des QuizCard
// ###########################################################################

import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { quizApi } from "@/services/quizApi";
import type { QuizSummary } from "@/types/quiz";
import { QuizCard } from "./QuizCard";

export function QuizSection() {
  const { t } = useTranslation();
  const colors = useColors();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const { data } = await quizApi.list();
      setQuizzes(data);
    } catch {
      // Quiz is optional, fail silently
    } finally {
      setLoading(false);
    }
  };

  if (loading || quizzes.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="game-controller-outline" size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textSecondary }]}>{t("home.weeklyQuiz")}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {quizzes.map((quiz) => (
          <View key={quiz.quiz_id} style={styles.cardWrapper}>
            <QuizCard quiz={quiz} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  cardWrapper: {
    width: 260,
  },
});
