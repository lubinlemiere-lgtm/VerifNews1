// ###########################################################################
// # NotificationService — Gestion des notifications push et locales
// # Utilise expo-notifications + expo-device
// # Gère: permission, token push, listeners, notifications locales
// ###########################################################################

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

// ── Configuration par défaut du handler ──────────────────────────────────
// Détermine comment les notifications sont affichées quand l'app est au premier plan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Android: créer le canal de notification ─────────────────────────────
async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "VerifNews",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#6C63FF",
      sound: "default",
    });

    // Canal silencieux pour les breaking news (optionnel)
    await Notifications.setNotificationChannelAsync("breaking", {
      name: "Breaking News",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: "#FF6B6B",
      sound: "default",
    });
  }
}

// ── Demander la permission et obtenir le push token ─────────────────────
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Les notifications ne fonctionnent que sur un vrai appareil
    if (!Device.isDevice) {
      console.log("Push notifications require a physical device");
      return null;
    }

    // Configurer le canal Android
    await setupAndroidChannel();

    // Vérifier / demander la permission
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    // Récupérer le token Expo Push (fonctionne sans Firebase pour le dev)
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn("No EAS project ID found, cannot get push token");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log("Push token:", tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error("Error registering for push notifications:", error);
    return null;
  }
}

// ── Envoyer une notification locale ─────────────────────────────────────
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: "default",
    },
    trigger: null, // Immédiat
  });
  return id;
}

// ── Planifier une notification locale ───────────────────────────────────
export async function scheduleLocalNotification(
  title: string,
  body: string,
  secondsFromNow: number,
  data?: Record<string, unknown>,
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsFromNow,
    },
  });
  return id;
}

// ── Listeners pour les notifications (tap, reception) ───────────────────
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// ── Gestion du badge ────────────────────────────────────────────────────
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// ── Annuler les notifications planifiées ─────────────────────────────────
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Vérifier le statut des permissions ──────────────────────────────────
export async function getNotificationPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}
