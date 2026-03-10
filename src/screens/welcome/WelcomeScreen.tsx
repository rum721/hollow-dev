import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing } from '../../theme';
import { HollowText } from '../../components/common/HollowText';
import { AmberButton } from '../../components/common/AmberButton';
import { AmberGlowDot } from '../../components/common/AmberGlowDot';
import { GlowParticles } from '../../components/common/GlowParticles';
import { useI18n } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import type { RootStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

export function WelcomeScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const { isDesktop } = useResponsive();

  return (
    <View style={styles.container}>
      <GlowParticles />
      <View style={styles.content}>
        <View style={styles.glowArea}>
          <AmberGlowDot size={isDesktop ? 60 : 50} />
        </View>
        <HollowText variant="display" center style={styles.title}>
          {t('app.name')}
        </HollowText>
        <HollowText variant="body" color={colors.textSecondary} center style={styles.tagline}>
          {t('app.tagline')}
        </HollowText>
      </View>
      <View style={[styles.bottom, isDesktop && styles.bottomDesktop]}>
        <AmberButton
          title={t('welcome.begin')}
          onPress={() => navigation.navigate('OnboardingPrivacy')}
          style={StyleSheet.flatten([styles.button, isDesktop ? styles.buttonDesktop : undefined])}
        />
      </View>
    </View>
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
    paddingHorizontal: spacing['3xl'],
    paddingBottom: spacing['5xl'],
    alignItems: 'center',
  },
  bottomDesktop: {
    paddingBottom: spacing['3xl'],
  },
  button: {
    width: '100%',
  },
  buttonDesktop: {
    maxWidth: 360,
  },
});
