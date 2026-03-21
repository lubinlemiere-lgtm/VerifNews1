// ###########################################################################
// # Types Quiz — 2 quiz/semaine (rotation) + culture G mensuel
// # Toujours 15 questions. Easy = fun_fact (blague/anecdote).
// # Leaderboard, badges, streaks inclus.
// ###########################################################################

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  difficulty: "easy" | "medium" | "hard";
  fun_fact: string | null;
  sort_order: number;
}

export interface Quiz {
  id: number;
  category_slug: string | null;
  category_name: string | null;
  title: string;
  week_start: string;
  quiz_type: "weekly" | "monthly";
  question_count: number;
  questions: QuizQuestion[];
  already_played: boolean;
  user_score: number | null;
}

export interface QuizResult {
  score: number;
  total: number;
  correct_indices: number[];
  duration_seconds: number | null;
}

export interface QuizWinner {
  display_name: string;
  score: number;
  total: number;
  duration_seconds: number | null;
}

export interface QuizSummary {
  quiz_id: number;
  category_slug: string | null;
  category_name: string | null;
  title: string;
  week_start: string;
  quiz_type: "weekly" | "monthly";
  question_count: number;
  day_of_week: number | null; // 0=Monday, 3=Thursday
  already_played: boolean;
  winner: QuizWinner | null;
}

export interface LeaderboardEntry {
  rank: number;
  display_name: string;
  score: number;
  total: number;
  duration_seconds: number | null;
}

export interface LeaderboardOut {
  quiz_id: number | null;
  period: "weekly" | "monthly";
  entries: LeaderboardEntry[];
}
