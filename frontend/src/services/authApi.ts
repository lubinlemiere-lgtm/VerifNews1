// ###########################################################################
// # Auth API — Endpoints authentification
// # login(), register(), getMe(), refreshToken()
// ###########################################################################

import api from "./api";
import type { TokenResponse, User } from "@/types/user";

export const authApi = {
  register: (email: string, password: string, displayName?: string) =>
    api.post<TokenResponse>("/auth/register", {
      email,
      password,
      display_name: displayName,
    }),

  login: (email: string, password: string) =>
    api.post<TokenResponse>("/auth/login", { email, password }),

  getMe: () => api.get<User>("/auth/me"),

  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post("/auth/reset-password", { token, new_password: newPassword }),
};
