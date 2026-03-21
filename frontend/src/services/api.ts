// ###########################################################################
// # API Client — Instance Axios centrale
// # Intercepteur requete: ajoute le JWT Bearer token
// # Intercepteur reponse: refresh automatique si 401
// # Base URL: configuree dans constants/config.ts
// # SecureStore: natif mobile, fallback localStorage sur web
// ###########################################################################

import axios from "axios";
import { Platform } from "react-native";

import { API_BASE_URL } from "@/constants/config";

// # Abstraction SecureStore — fonctionne sur mobile ET web
const TokenStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    const SecureStore = require("expo-secure-store");
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    const SecureStore = require("expo-secure-store");
    return SecureStore.setItemAsync(key, value);
  },
  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    const SecureStore = require("expo-secure-store");
    return SecureStore.deleteItemAsync(key);
  },
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// # Intercepteur requete: ajoute le JWT Bearer token
api.interceptors.request.use(async (config) => {
  const token = await TokenStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// # Mutex pour eviter plusieurs refresh simultanes (race condition)
let refreshPromise: Promise<string | null> | null = null;

// # Intercepteur reponse: refresh automatique si 401
// # Note: la detection offline est geree par networkStore (navigator.onLine)
// # et NON par les erreurs API (un backend down ≠ pas d'internet)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Si un refresh est deja en cours, on attend son resultat
      if (refreshPromise) {
        try {
          const newToken = await refreshPromise;
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch {
          // Refresh echoue, on rejette
        }
        return Promise.reject(error);
      }

      // Sinon, on lance le refresh (un seul a la fois)
      refreshPromise = (async () => {
        try {
          const refreshToken = await TokenStorage.getItem("refresh_token");
          if (!refreshToken) return null;
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          }, { timeout: 10000 });
          await TokenStorage.setItem("access_token", data.access_token);
          await TokenStorage.setItem("refresh_token", data.refresh_token);
          return data.access_token as string;
        } catch {
          await TokenStorage.deleteItem("access_token");
          await TokenStorage.deleteItem("refresh_token");
          return null;
        } finally {
          refreshPromise = null;
        }
      })();

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export { TokenStorage };
export default api;
