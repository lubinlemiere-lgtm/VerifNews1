// ###########################################################################
// # useNotifications — Hook d'initialisation des notifications push
// # À utiliser dans le layout principal pour:
// # 1. Enregistrer le token push au démarrage
// # 2. Écouter les notifications reçues (foreground)
// # 3. Écouter les taps sur notifications (navigation)
// ###########################################################################

import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  clearBadge,
} from "@/services/notificationService";
import type { EventSubscription } from "expo-notifications";
import api from "@/services/api";
import { useAuthStore } from "@/store/authStore";

export function useNotifications() {
  const router = useRouter();
  const notifReceivedSub = useRef<EventSubscription | null>(null);
  const notifResponseSub = useRef<EventSubscription | null>(null);

  useEffect(() => {
    // 1. Enregistrer pour les push notifications
    registerForPushNotifications().then((token) => {
      if (token) {
        // Send token to backend if user is authenticated
        const isAuth = useAuthStore.getState().isAuthenticated;
        if (isAuth) {
          api.post("/auth/push-token", { token }).catch(() => {});
        }
        if (__DEV__) console.log("Push token registered:", token);
      }
    });

    // 2. Listener: notification reçue en foreground
    notifReceivedSub.current = addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) console.log("Notification received:", notification.request.content);
      },
    );

    // 3. Listener: utilisateur tape sur une notification
    notifResponseSub.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;

      // Navigation vers l'article si la notification contient un articleId
      if (data?.articleId) {
        router.push(`/article/${data.articleId}` as any);
      }

      // Clear badge après interaction
      clearBadge();
    });

    // Clear badge au démarrage de l'app
    clearBadge();

    return () => {
      notifReceivedSub.current?.remove();
      notifResponseSub.current?.remove();
    };
  }, []);
}
