import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  withRepeat,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing } from '../../theme';
import { HollowText } from '../../components/common/HollowText';
import { AmberGlowDot } from '../../components/common/AmberGlowDot';
import { useI18n } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import type { RootStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Launch'>;

export function LaunchScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const { isDesktop } = useResponsive();

  // Fade-in animations
  const titleOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const hintOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const taglineTranslateY = useSharedValue(15);
  const dotScale = useSharedValue(0.6);

  useEffect(() => {
    // Staggered entrance animation
    dotScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    titleOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    titleTranslateY.value = withDelay(400, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
    taglineOpacity.value = withDelay(700, withTiming(1, { duration: 600 }));
    taglineTranslateY.value = withDelay(700, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
    // Hint fades in after everything else, then gently pulses
    hintOpacity.value = withDelay(1200, withTiming(0.6, { duration: 800 }));
    // After initial fade in, pulse the hint
    setTimeout(() => {
      hintOpacity.value = withRepeat(
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }, 2200);
  }, []);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotScale.value,
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const hintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  const handleEnter = () => {
    navigation.replace('MainTabs' as any);
  };

  return (
    <TouchableWithoutFeedback onPress={handleEnter}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Animated.View style={[styles.glowArea, dotAnimatedStyle]}>
            <AmberGlowDot size={isDesktop ? 60 : 50} />
          </Animated.View>
          <Animated.View style={titleAnimatedStyle}>
            <HollowText variant="display" center style={styles.title}>
              {t('app.name')}
            </HollowText>
          </Animated.View>
          <Animated.View style={taglineAnimatedStyle}>
            <HollowText variant="body" color={colors.textSecondary} center style={styles.tagline}>
              {t('app.tagline')}
            </HollowText>
          </Animated.View>
        </View>
        <Animated.View style={[styles.bottom, hintAnimatedStyle]}>
          <HollowText variant="caption" color={colors.textMuted} center>
            {t('launch.tapToEnter')}
          </HollowText>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  glowArea: {
    marginBottom: spacing['4xl'],
  },
  title: {
    marginBottom: spacing.lg,
  },
  tagline: {
    paddingHorizontal: spacing['2xl'],
    lineHeight: 24,
  },
  bottom: {
    paddingBottom: spacing['5xl'],
    alignItems: 'center',
  },
});
