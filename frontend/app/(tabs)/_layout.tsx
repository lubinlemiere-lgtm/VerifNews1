// ###########################################################################
// # Tabs Layout — Navigation par onglets (3 tabs + drawer profil)
// # Feed | Categories | Favoris   [profile button ouvre le drawer]
// # Tab bar native cachee — TabBarOverlay rendu dans chaque ecran
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Pressable, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useDrawerStore } from "@/store/drawerStore";
import { useTranslation } from "@/hooks/useTranslation";
import { ProfileDrawer } from "@/components/ProfileDrawer";

// # Bouton profil — icone en haut a droite du header (ouvre le drawer)
function ProfileButton() {
  const colors = useColors();
  const openDrawer = useDrawerStore((s) => s.open);
  return (
    <Pressable
      onPress={openDrawer}
      style={{ marginRight: 14, padding: 4 }}
    >
      <Ionicons name="person-circle-outline" size={28} color={colors.text} />
    </Pressable>
  );
}

// ── Main layout ────────────────────────────────────────────────────────────
export default function TabsLayout() {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerRight: () => <ProfileButton />,
          // Hide native tab bar — TabBarOverlay is rendered inside each screen
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: t("tabs.feed"), headerShown: false }}
        />
        <Tabs.Screen name="search" options={{ href: null }} />
        <Tabs.Screen name="quiz" options={{ title: t("tabs.quiz") }} />
        <Tabs.Screen name="categories" options={{ href: null }} />
        <Tabs.Screen name="bookmarks" options={{ title: t("tabs.saved") }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>

      <ProfileDrawer />
    </View>
  );
}
