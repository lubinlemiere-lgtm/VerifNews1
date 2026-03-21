// ###########################################################################
// # Quiz API — 2 quiz/semaine + culture G mensuel + leaderboard
// ###########################################################################

import api from "./api";
import type { Quiz, QuizResult, QuizSummary, LeaderboardOut } from "@/types/quiz";

export const quizApi = {
  /** Get all current-week quizzes (2 weekly + optional monthly). */
  list: () => api.get<QuizSummary[]>("/quiz"),

  /** Get full quiz with questions. */
  detail: (quizId: number) => api.get<Quiz>(`/quiz/${quizId}`),

  /** Submit answers for a quiz. */
  submit: (quizId: number, answers: number[], durationSeconds?: number) =>
    api.post<QuizResult>(`/quiz/${quizId}/submit`, {
      answers,
      duration_seconds: durationSeconds ?? null,
    }),

  /** Get leaderboard for a specific quiz. */
  leaderboard: (quizId: number) =>
    api.get<LeaderboardOut>(`/quiz/${quizId}/leaderboard`),

  /** Get aggregated monthly leaderboard. */
  monthlyLeaderboard: () =>
    api.get<LeaderboardOut>("/quiz/leaderboard/monthly"),
};
