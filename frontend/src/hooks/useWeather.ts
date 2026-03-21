// ###########################################################################
// # Hook Meteo — Recupere la meteo via Open-Meteo (gratuit, sans cle API)
// # Utilise expo-location sur mobile natif, navigator.geolocation sur web
// # Fallback sur Paris si la geoloc n'est pas disponible
// # Retourne: temperature, icone WMO, nom de ville
// ###########################################################################

import { useEffect, useState } from "react";
import { Platform } from "react-native";

type WeatherData = {
  temp: number;
  icon: string; // Ionicons name
  city: string;
};

// WMO weather code → Ionicons icon name
function wmoToIcon(code: number): string {
  if (code === 0) return "sunny";
  if (code <= 3) return "partly-sunny";
  if (code <= 48) return "cloud"; // fog / overcast
  if (code <= 57) return "rainy"; // drizzle
  if (code <= 67) return "rainy"; // rain
  if (code <= 77) return "snow"; // snow
  if (code <= 82) return "rainy"; // rain showers
  if (code <= 86) return "snow"; // snow showers
  return "thunderstorm"; // 95+ thunderstorm
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather(lat: number, lon: number, city: string) {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current_weather=true&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled) return;
        const cw = data.current_weather;
        setWeather({
          temp: Math.round(cw.temperature),
          icon: wmoToIcon(cw.weathercode),
          city,
        });
      } catch {
        // silent fail — header just shows date without weather
      }
    }

    async function getLocationNative() {
      try {
        // Dynamic import — expo-location may not be installed
        const Location = await import("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
          });
          return { lat: loc.coords.latitude, lon: loc.coords.longitude };
        }
      } catch {
        // expo-location not installed or permission denied
      }
      return null;
    }

    async function getLocationWeb(): Promise<{ lat: number; lon: number } | null> {
      return new Promise((resolve) => {
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => resolve(null),
            { timeout: 5000 }
          );
        } else {
          resolve(null);
        }
      });
    }

    async function init() {
      let coords: { lat: number; lon: number } | null = null;

      if (Platform.OS === "web") {
        coords = await getLocationWeb();
      } else {
        coords = await getLocationNative();
      }

      // Fallback: Paris
      const lat = coords?.lat ?? 48.8566;
      const lon = coords?.lon ?? 2.3522;
      const city = coords ? "" : "Paris";
      fetchWeather(lat, lon, city);
    }

    init();
    return () => { cancelled = true; };
  }, []);

  return weather;
}
