// ###########################################################################
// # OnboardingFlow — 3 ecrans d'introduction au premier lancement
// # Swipe horizontal avec pagination, animation des dots
// # Tutoriel 3 ecrans accessible depuis les parametres
// ###########################################################################

import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type OnboardingScreen = {
  titleKey: string;
  descKey: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const SCREENS: OnboardingScreen[] = [
  {
    titleKey: "onboarding.verified",
    descKey: "onboarding.verifiedDesc",
    icon: "shield-checkmark",
  },
  {
    titleKey: "onboarding.search",
    descKey: "onboarding.searchDesc",
    icon: "search",
  },
  {
    titleKey: "onboarding.quiz",
    descKey: "onboarding.quizDesc",
    icon: "trophy",
  },
];

type Props = {
  onComplete: () => void;
};

export function OnboardingFlow({ onComplete }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Animated value tracking scroll position for dot transitions
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const goToNext = () => {
    if (currentIndex < SCREENS.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    } else {
      onComplete();
    }
  };

  const isLastScreen = currentIndex === SCREENS.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Scrollable screens */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        style={styles.scrollView}
      >
        {SCREENS.map((screen, index) => (
          <View key={index} style={[styles.screen, { width: SCREEN_WIDTH }]}>
            {/* Icon circle */}
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Ionicons
                name={screen.icon}
                size={80}
                color={colors.primary}
              />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.text }]}>
              {t(screen.titleKey)}
            </Text>

            {/* Description */}
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t(screen.descKey)}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom section: dots + button */}
      <View style={styles.bottomSection}>
        {/* Pagination dots */}
        <View style={styles.dotsContainer}>
          {SCREENS.map((_, index) => {
            // Animated dot width and opacity based on scroll position
            const inputRange = [
              (index - 1) * SCREEN_WIDTH,
              index * SCREEN_WIDTH,
              (index + 1) * SCREEN_WIDTH,
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: "clamp",
            });

            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Action button */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={goToNext}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {isLastScreen ? t("onboarding.start") : t("onboarding.next")}
          </Text>
          {!isLastScreen && (
            <Ionicons
              name="arrow-forward"
              size={20}
              color={colors.background}
              style={styles.buttonIcon}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
  },
  scrollView: {
    flex: 1,
  },
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  bottomSection: {
    paddingBottom: Platform.OS === "ios" ? 50 : 40,
    paddingHorizontal: 40,
    alignItems: "center",
    gap: 32,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 22,
    width: "100%",
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
  },
  buttonIcon: {
    marginLeft: 8,
  },
});
