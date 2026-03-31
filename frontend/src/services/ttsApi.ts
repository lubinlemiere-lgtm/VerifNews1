import { API_BASE_URL } from "@/constants/config";

export const ttsApi = {
  getAudioUrl: (articleId: string, lang = "en", rate = 1.0) =>
    `${API_BASE_URL}/tts/${articleId}?lang=${lang}&rate=${rate}`,
};
