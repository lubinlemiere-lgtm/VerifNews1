// ###########################################################################
// # Config — URL de base de l'API backend
// # Android emulateur: 10.0.2.2 | iOS/Web: localhost
// ###########################################################################

import { Platform } from "react-native";

/**
 * API base URL configuration.
 *
 * In development:
 * - Android emulator: 10.0.2.2 (maps to host's localhost)
 * - iOS simulator: localhost works
 * - Physical device: use your machine's local IP (run `ipconfig` to find it)
 *
 * To use a physical device, change DEV_HOST below to your PC's IP address.
 */
const DEV_HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";
// Uncomment and set your IP for testing on a physical device:
// const DEV_HOST = "192.168.1.XX";

export const API_BASE_URL = __DEV__
  ? `http://${DEV_HOST}:8000/api/v1`
  : "https://verifnews-api.onrender.com/api/v1";

export const SUPPORT_EMAIL = "contact.verifnews@gmail.com";
export const APP_VERSION = "1.0.0";

// # Liens store — a remplacer par les vrais liens une fois publie
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.verifnews.app";
export const APP_STORE_URL =
  "https://apps.apple.com/app/verifnews/id000000000"; // TODO: remplacer l'id

// # Message de partage de l'app
export const APP_SHARE_MESSAGE_FR =
  "Decouvre VerifNews — l'app qui verifie les news pour toi ! Chaque article est valide par 2+ sources fiables.\n\n";
export const APP_SHARE_MESSAGE_EN =
  "Check out VerifNews — the app that verifies the news for you! Every article is validated by 2+ reliable sources.\n\n";
