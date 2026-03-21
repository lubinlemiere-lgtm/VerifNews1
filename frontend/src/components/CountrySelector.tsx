// ###########################################################################
// # CountrySelector — Modal de selection de pays (20 pays)
// # Barre de recherche + liste cliquable. Utilise pour la politique
// ###########################################################################

import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "BR", name: "Brazil" },
  { code: "JP", name: "Japan" },
  { code: "IN", name: "India" },
  { code: "KR", name: "South Korea" },
  { code: "MX", name: "Mexico" },
  { code: "NG", name: "Nigeria" },
  { code: "ZA", name: "South Africa" },
  { code: "MA", name: "Morocco" },
  { code: "EG", name: "Egypt" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "CN", name: "China" },
];

interface CountrySelectorProps {
  visible: boolean;
  current: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

export function CountrySelector({
  visible,
  current,
  onSelect,
  onClose,
}: CountrySelectorProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const [search, setSearch] = useState("");

  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t("country.selectTitle")}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder={t("country.search")}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.item,
                  item.code === current && { backgroundColor: colors.surfaceLight },
                ]}
                onPress={() => {
                  onSelect(item.code);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={item.name}
              >
                <Text style={[styles.itemText, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.itemCode, { color: colors.textMuted }]}>{item.code}</Text>
              </Pressable>
            )}
          />
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeText, { color: colors.primary }]}>{t("country.close")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  input: {
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  itemText: {
    fontSize: 15,
  },
  itemCode: {
    fontSize: 13,
  },
  closeBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 8,
  },
  closeText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
