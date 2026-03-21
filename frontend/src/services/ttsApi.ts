import { API_BASE_URL } from "@/constants/config";

export const ttsApi = {
  getAudioUrl: (articleId: string, lang = "en") =>
    `${API_BASE_URL}/tts/${articleId}?lang=${lang}`,
};
