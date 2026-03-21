// ###########################################################################
// # Hook useAudio — Lecture audio TTS d'un article via expo-av
// # Charge le fichier audio depuis l'API TTS, gere play/pause/stop,
// # retourne la progression et la duree. Nettoyage auto au unmount.
// ###########################################################################

import { Audio, AVPlaybackStatus } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";

import { ttsApi } from "@/services/ttsApi";
import { useLanguageStore } from "@/store/languageStore";
import { usePreferencesStore } from "@/store/preferencesStore";

interface UseAudioReturn {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number; // 0 to 1
  duration: number; // milliseconds
}

export function useAudio(articleId: string): UseAudioReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const isMountedRef = useRef(true);

  // ---- Callback de mise a jour du statut ----
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!isMountedRef.current) return;
    if (!status.isLoaded) return;

    setIsPlaying(status.isPlaying);
    setDuration(status.durationMillis ?? 0);

    if (status.durationMillis && status.durationMillis > 0) {
      setProgress(status.positionMillis / status.durationMillis);
    }

    // Si la lecture est terminee, rembobiner au debut
    if (status.didJustFinish) {
      setIsPlaying(false);
      setProgress(0);
      soundRef.current?.setPositionAsync(0).catch(() => {});
    }
  }, []);

  // ---- Charger le son si pas encore charge ----
  const ensureLoaded = useCallback(async (): Promise<Audio.Sound | null> => {
    if (soundRef.current) return soundRef.current;

    const lang = useLanguageStore.getState().language;
    const resolvedLang = lang === "fr" || lang === "en" ? lang : "fr";
    const uri = ttsApi.getAudioUrl(articleId, resolvedLang);

    setIsLoading(true);
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      if (!isMountedRef.current) {
        // Composant demonte pendant le chargement
        await sound.unloadAsync();
        return null;
      }

      soundRef.current = sound;
      return sound;
    } catch (error) {
      console.warn("[useAudio] Failed to load audio:", error);
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [articleId, onPlaybackStatusUpdate]);

  // ---- Actions ----
  const play = useCallback(async () => {
    try {
      const sound = await ensureLoaded();
      if (!sound) return;
      // Appliquer la vitesse TTS preferee
      const speed = usePreferencesStore.getState().ttsSpeed;
      if (speed !== 1) {
        await sound.setRateAsync(speed, true).catch(() => {});
      }
      await sound.playAsync();
    } catch (error) {
      console.warn("[useAudio] Play error:", error);
    }
  }, [ensureLoaded]);

  const pause = useCallback(async () => {
    try {
      if (!soundRef.current) return;
      await soundRef.current.pauseAsync();
    } catch (error) {
      console.warn("[useAudio] Pause error:", error);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      if (!soundRef.current) return;
      await soundRef.current.stopAsync();
      await soundRef.current.setPositionAsync(0);
      if (isMountedRef.current) {
        setIsPlaying(false);
        setProgress(0);
      }
    } catch (error) {
      console.warn("[useAudio] Stop error:", error);
    }
  }, []);

  // ---- Nettoyage au unmount ----
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      const sound = soundRef.current;
      if (sound) {
        sound.stopAsync().then(() => sound.unloadAsync()).catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  // ---- Si articleId change, decharger l'ancien son ----
  useEffect(() => {
    return () => {
      const sound = soundRef.current;
      if (sound) {
        sound.stopAsync().then(() => sound.unloadAsync()).catch(() => {});
        soundRef.current = null;
      }
      setIsPlaying(false);
      setIsLoading(false);
      setProgress(0);
      setDuration(0);
    };
  }, [articleId]);

  return { play, pause, stop, isPlaying, isLoading, progress, duration };
}
