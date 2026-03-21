// ###########################################################################
// # Store Network — Detection du statut reseau (online/offline)
// # Met a jour l'etat quand les appels API echouent (network error)
// # Sur web, utilise aussi navigator.onLine + events
// ###########################################################################

import { create } from "zustand";
import { Platform } from "react-native";

interface NetworkState {
  isConnected: boolean;
  setConnected: (connected: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isConnected: true,
  setConnected: (connected: boolean) => set({ isConnected: connected }),
}));

// Sur web, ecouter les events online/offline du navigateur
if (Platform.OS === "web" && typeof window !== "undefined") {
  const updateStatus = () => {
    useNetworkStore.getState().setConnected(navigator.onLine);
  };
  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);
  // Init
  updateStatus();
}
