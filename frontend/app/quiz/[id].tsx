// ###########################################################################
// # Quiz Detail — 15 questions (toujours)
// # Timer total, navigation, fun_fact pour easy, resultat avec leaderboard
// ###########################################################################

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryColors } from "@/constants/colors";
import { CATEGORY_ICONS } from "@/constants/categories";
import { useColors } from "@/hooks/useColors";
import { quizApi } from "@/services/quizApi";
import { useTranslation } from "@/hooks/useTranslation";
import type { Quiz, QuizResult, LeaderboardOut } from "@/types/quiz";
import { useQuizHistoryStore } from "@/store/quizHistoryStore";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AuthGateModal } from "@/components/ui/AuthGateModal";
import { useAuthStore } from "@/store/authStore";
import { useGamificationStore } from "@/store/gamificationStore";

// ── Constantes et utilitaires ────────────────────────────────────────
const DIFFICULTY_KEYS: Record<string, { key: string; colorKey: "success" | "warning" | "danger" }> = {
  easy: { key: "quiz.easy", colorKey: "success" },
  medium: { key: "quiz.medium", colorKey: "warning" },
  hard: { key: "quiz.hard", colorKey: "danger" },
};

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ── Composant principal ─────────────────────────────────────────────
export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, language } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // ── Etat local ──────────────────────────────────────────────────
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardOut | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Timer ───────────────────────────────────────────────────────
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    loadQuiz();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  // ── Chargement du quiz depuis l'API ─────────────────────────────
  const loadQuiz = async () => {
    try {
      const { data } = await quizApi.detail(Number(id));
      setQuiz(data);
      setAnswers(new Array(data.questions.length).fill(null));

      // Start timer if not already played
      if (!data.already_played) {
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);
      }
    } catch {
      Alert.alert(t("quiz.error"), t("quiz.loadError"));
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // ── Gestion des reponses ────────────────────────────────────────
  const selectAnswer = (optionIndex: number) => {
    if (result) return;
    const newAnswers = [...answers];
    newAnswers[currentQ] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    if (!isAuthenticated) {
      setShowAuthGate(true);
      return;
    }

    const unanswered = answers.filter((a) => a === null).length;
    if (unanswered > 0) {
      Alert.alert(
        t("quiz.unanswered"),
        `${unanswered} ${t("quiz.unansweredMsg")}`,
        [
          { text: t("quiz.cancel"), style: "cancel" },
          { text: t("quiz.submit"), onPress: doSubmit },
        ]
      );
      return;
    }
    doSubmit();
  };

  // ── Soumission au backend + gamification ────────────────────────
  const doSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      const finalAnswers = answers.map((a) => (a === null ? -1 : a));
      const { data } = await quizApi.submit(quiz.id, finalAnswers, duration);
      setResult(data);

      // Save to local history
      useQuizHistoryStore.getState().addEntry({
        quizId: quiz.id,
        quizType: quiz.quiz_type,
        categorySlug: quiz.category_slug,
        categoryName: quiz.category_name,
        score: data.score,
        total: data.total,
        durationSeconds: data.duration_seconds,
      });

      // Gamification: points quiz (base 10 + 1 par bonne reponse)
      useGamificationStore.getState().addPoints("quiz", data.score);

      // Load leaderboard
      try {
        const lb = await quizApi.leaderboard(quiz.id);
        setLeaderboard(lb.data);
      } catch { /* ignore */ }
    } catch {
      Alert.alert(t("quiz.error"), t("quiz.alreadyPlayed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!quiz) return null;

  // Guard: empty questions array
  if (!quiz.questions || quiz.questions.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Ionicons name="help-circle-outline" size={48} color={colors.textMuted} />
        <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 12, fontWeight: "600" }}>
          {t("quiz.noQuestions") ?? "Aucune question disponible"}
        </Text>
        <Pressable
          style={{ marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, backgroundColor: colors.primary }}
          onPress={() => router.back()}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>{t("quiz.back")}</Text>
        </Pressable>
      </View>
    );
  }

  const question = quiz.questions[currentQ];
  const diff = DIFFICULTY_KEYS[question.difficulty] || DIFFICULTY_KEYS.easy;
  const isMonthly = quiz.quiz_type === "monthly";
  const catIcon = isMonthly
    ? "globe-outline"
    : CATEGORY_ICONS[quiz.category_slug ?? ""] || "help-circle-outline";
  const catColor = isMonthly
    ? "#9B59B6"
    : CategoryColors[quiz.category_slug ?? ""] || colors.primary;
  const answeredCount = answers.filter((a) => a !== null).length;
  const progress = answeredCount / quiz.questions.length;

  // ── MODE RESULTAT — Affichage du score, leaderboard, corrections ──
  if (result || quiz.already_played) {
    const score = result?.score ?? quiz.user_score ?? 0;
    const total = result?.total ?? quiz.questions.length;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const duration = result?.duration_seconds ?? null;

    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.resultContent}
      >
        <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Score icon */}
          <View style={[styles.resultIconCircle, {
            backgroundColor: pct >= 80 ? colors.success + "20" : pct >= 50 ? colors.warning + "20" : colors.danger + "20",
          }]}>
            <Ionicons
              name={pct >= 80 ? "trophy" : pct >= 50 ? "thumbs-up" : "fitness"}
              size={40}
              color={pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.danger}
            />
          </View>

          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {pct >= 80 ? t("quiz.excellent") : pct >= 50 ? t("quiz.wellDone") : t("quiz.keepGoing")}
          </Text>
          <Text style={[styles.resultScore, { color: catColor }]}>
            {score}/{total}
          </Text>
          <Text style={[styles.resultPct, { color: colors.textSecondary }]}>
            {pct}% {t("quiz.correctAnswers")}
          </Text>

          {/* Duration */}
          {duration != null && (
            <View style={[styles.durationRow, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.durationText, { color: colors.textMuted }]}>
                {formatTimer(duration)}
              </Text>
            </View>
          )}

          {/* Progress bar */}
          <View style={[styles.resultBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.resultBarFill,
                {
                  width: `${pct}%`,
                  backgroundColor: pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.danger,
                },
              ]}
            />
          </View>

          {/* Leaderboard */}
          {leaderboard && leaderboard.entries.length > 0 && (
            <View style={styles.leaderboardSection}>
              <Text style={[styles.leaderboardTitle, { color: colors.text }]}>
                <Ionicons name="podium-outline" size={14} color={colors.primary} />
                {"  "}{t("quiz.leaderboard")}
              </Text>
              {leaderboard.entries.slice(0, 5).map((entry) => (
                <View
                  key={entry.rank}
                  style={[styles.lbRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.lbRank, {
                    color: entry.rank <= 3 ? colors.warning : colors.textMuted,
                  }]}>
                    {entry.rank <= 3 ? ["", t("quiz.rank1"), t("quiz.rank2"), t("quiz.rank3")][entry.rank] : `${entry.rank}${t("quiz.rankN")}`}
                  </Text>
                  <Text style={[styles.lbName, { color: colors.text }]} numberOfLines={1}>
                    {entry.display_name}
                  </Text>
                  <Text style={[styles.lbScore, { color: colors.primary }]}>
                    {entry.score}/{entry.total}
                  </Text>
                  {entry.duration_seconds != null && (
                    <Text style={[styles.lbTime, { color: colors.textMuted }]}>
                      {formatTimer(entry.duration_seconds)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Answers review */}
          {result && (
            <View style={styles.answersReview}>
              <Text style={[styles.reviewTitle, { color: colors.textSecondary }]}>
                {t("quiz.answers")}
              </Text>
              {quiz.questions.map((q, i) => {
                const userAnswer = answers[i];
                const correct = result.correct_indices[i];
                const isCorrect = userAnswer === correct;
                return (
                  <View key={q.id} style={[styles.reviewRow, { borderBottomColor: colors.border }]}>
                    <Ionicons
                      name={isCorrect ? "checkmark-circle" : "close-circle"}
                      size={18}
                      color={isCorrect ? colors.success : colors.danger}
                    />
                    <View style={styles.reviewQBlock}>
                      <Text style={[styles.reviewQ, { color: colors.textSecondary }]} numberOfLines={2}>
                        {q.question}
                      </Text>
                      {!isCorrect && (
                        <Text style={[styles.reviewCorrect, { color: colors.success }]} numberOfLines={1}>
                          {q.options[correct]}
                        </Text>
                      )}
                      {q.fun_fact && (
                        <Text style={[styles.reviewFunFact, { color: colors.textMuted }]} numberOfLines={2}>
                          {q.fun_fact}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backBtnText, { color: colors.text }]}>{t("quiz.back")}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── MODE QUESTION — Navigation entre les questions ─────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 16 : insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Ionicons name={catIcon as any} size={18} color={catColor} />
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {quiz.category_name ?? t("quiz.cultureG")}
          </Text>
        </View>
        {/* Timer */}
        <View style={[styles.timerBadge, { backgroundColor: colors.surfaceLight }]}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={[styles.timerText, { color: colors.textMuted }]}>
            {formatTimer(elapsedSeconds)}
          </Text>
        </View>
        <Text style={[styles.headerCounter, { color: colors.textMuted }]}>
          {currentQ + 1}/{quiz.questions.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: catColor }]} />
      </View>

      {/* Question */}
      <ScrollView style={styles.questionArea} contentContainerStyle={styles.questionContent}>
        {/* Difficulty badge */}
        <View style={[styles.diffBadge, { backgroundColor: colors[diff.colorKey] + "22" }]}>
          <Text style={[styles.diffText, { color: colors[diff.colorKey] }]}>{t(diff.key)}</Text>
        </View>

        <Text style={[styles.questionText, { color: colors.text }]}>{question.question}</Text>

        {/* Options */}
        {question.options.map((opt, i) => {
          const isSelected = answers[currentQ] === i;
          return (
            <Pressable
              key={i}
              style={[
                styles.option,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSelected && { borderColor: catColor, backgroundColor: catColor + "10" },
              ]}
              onPress={() => selectAnswer(i)}
            >
              <View style={[
                styles.optionCircle,
                { backgroundColor: colors.surfaceLight },
                isSelected && { backgroundColor: catColor },
              ]}>
                <Text style={[
                  styles.optionLetter,
                  { color: colors.textMuted },
                  isSelected && { color: "#fff" },
                ]}>
                  {String.fromCharCode(65 + i)}
                </Text>
              </View>
              <Text style={[styles.optionText, { color: colors.text }, isSelected && { fontWeight: "600" }]}>
                {opt}
              </Text>
              {isSelected && <Ionicons name="checkmark" size={20} color={catColor} />}
            </Pressable>
          );
        })}

        {/* Fun fact — shown for easy questions after answering */}
        {question.fun_fact && answers[currentQ] !== null && (
          <View style={[styles.funFactBox, { backgroundColor: colors.warning + "12", borderColor: colors.warning + "30" }]}>
            <Ionicons name="happy-outline" size={18} color={colors.warning} />
            <Text style={[styles.funFactText, { color: colors.textSecondary }]}>
              {question.fun_fact}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={[styles.navBar, { borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 16 : insets.bottom + 12 }]}>
        <Pressable
          style={[styles.navBtn, currentQ === 0 && styles.navBtnDisabled]}
          onPress={() => setCurrentQ(Math.max(0, currentQ - 1))}
          disabled={currentQ === 0}
        >
          <Ionicons name="chevron-back" size={20} color={currentQ === 0 ? colors.textMuted : colors.text} />
          <Text style={[styles.navBtnText, { color: colors.text }, currentQ === 0 && { color: colors.textMuted }]}>
            {t("quiz.prev")}
          </Text>
        </Pressable>

        {/* Dot indicators */}
        <View style={styles.dots}>
          {quiz.questions.map((_, i) => (
            <Pressable key={i} onPress={() => setCurrentQ(i)}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: colors.border },
                  i === currentQ && { backgroundColor: catColor, width: 8, height: 8, borderRadius: 4 },
                  answers[i] !== null && i !== currentQ && { backgroundColor: colors.success },
                ]}
              />
            </Pressable>
          ))}
        </View>

        {currentQ < quiz.questions.length - 1 ? (
          <Pressable
            style={styles.navBtn}
            onPress={() => setCurrentQ(currentQ + 1)}
          >
            <Text style={[styles.navBtnText, { color: colors.text }]}>{t("quiz.next")}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        ) : (
          <Pressable
            style={[styles.navBtn, styles.submitBtn, { backgroundColor: catColor }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>
              {submitting ? "..." : t("quiz.finish")}
            </Text>
            <Ionicons name="checkmark-done" size={20} color="#fff" />
          </Pressable>
        )}
      </View>

      <AuthGateModal
        visible={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        feature="quiz"
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  closeBtn: {
    padding: 10,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  headerCounter: {
    fontSize: 13,
    fontWeight: "600",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  // Progress
  progressBar: {
    height: 4,
    marginHorizontal: 16,
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  // Question area
  questionArea: {
    flex: 1,
  },
  questionContent: {
    padding: 20,
  },
  diffBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 14,
  },
  diffText: {
    fontSize: 12,
    fontWeight: "700",
  },
  questionText: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
    marginBottom: 24,
  },
  // Options
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 2,
    gap: 12,
  },
  optionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLetter: {
    fontSize: 14,
    fontWeight: "700",
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  // Fun fact
  funFactBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  funFactText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: "italic",
  },
  // Navigation
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  submitBtn: {
    borderRadius: 10,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  // Dots
  dots: {
    flexDirection: "row",
    gap: 3,
    flexWrap: "wrap",
    justifyContent: "center",
    maxWidth: 160,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Result
  resultContent: {
    padding: 20,
    paddingTop: 60,
    alignItems: "center",
  },
  resultCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
  },
  resultIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  resultScore: {
    fontSize: 40,
    fontWeight: "900",
  },
  resultPct: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  durationText: {
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  resultBar: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 20,
  },
  resultBarFill: {
    height: 8,
    borderRadius: 4,
  },
  // Leaderboard
  leaderboardSection: {
    width: "100%",
    marginTop: 8,
    marginBottom: 16,
  },
  leaderboardTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  lbRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  lbRank: {
    fontSize: 13,
    fontWeight: "700",
    width: 30,
  },
  lbName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  lbScore: {
    fontSize: 14,
    fontWeight: "700",
  },
  lbTime: {
    fontSize: 11,
    fontWeight: "500",
    minWidth: 40,
    textAlign: "right",
  },
  // Answers review
  answersReview: {
    width: "100%",
    marginTop: 8,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  reviewQBlock: {
    flex: 1,
    gap: 2,
  },
  reviewQ: {
    fontSize: 13,
  },
  reviewCorrect: {
    fontSize: 12,
    fontWeight: "600",
  },
  reviewFunFact: {
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 1,
  },
  backBtn: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "center",
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
