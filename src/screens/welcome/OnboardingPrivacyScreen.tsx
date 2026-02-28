import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import { HollowText } from '../../components/common/HollowText';
import { AmberButton } from '../../components/common/AmberButton';
import { useI18n } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import type { RootStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OnboardingPrivacy'>;

export function OnboardingPrivacyScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const { isDesktop } = useResponsive();
  const [agreed, setAgreed] = useState(false);

  const features = [
    { icon: 'lock' as const, title: t('privacy.encryption'), desc: t('privacy.encryptionDesc') },
    { icon: 'hard-drive' as const, title: t('privacy.localStorage'), desc: t('privacy.localStorageDesc') },
    { icon: 'eye-off' as const, title: t('privacy.noTracking'), desc: t('privacy.noTrackingDesc') },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        <Feather name="shield" size={48} color={colors.amber} style={styles.icon} />
        <HollowText variant="heading" center style={styles.title}>
          {t('privacy.title')}
        </HollowText>
        <HollowText variant="body" color={colors.textSecondary} center style={styles.subtitle}>
          {t('privacy.subtitle')}
        </HollowText>

        <View style={styles.features}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Feather name={f.icon} size={20} color={colors.amber} />
              </View>
              <View style={styles.featureText}>
                <HollowText variant="body" color={colors.textPrimary}>{f.title}</HollowText>
                <HollowText variant="caption" color={colors.textSecondary}>{f.desc}</HollowText>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.bottom, isDesktop && styles.bottomDesktop]}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAgreed(!agreed)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Feather name="check" size={14} color={colors.background} />}
          </View>
          <HollowText variant="caption" color={colors.textSecondary} style={styles.checkboxLabel}>
            {t('privacy.agree')}
          </HollowText>
        </TouchableOpacity>

        <AmberButton
          title={t('onboarding.nickname.continue')}
          onPress={() => navigation.navigate('OnboardingNickname')}
          disabled={!agreed}
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
  contentDesktop: {
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  icon: {
    marginBottom: spacing.xl,
  },
  title: {
    marginBottom: spacing.md,
  },
  subtitle: {
    marginBottom: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  features: {
    width: '100%',
    gap: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  bottom: {
    paddingHorizontal: spacing['3xl'],
    paddingBottom: spacing['5xl'],
    alignItems: 'center',
    gap: spacing.lg,
  },
  bottomDesktop: {
    paddingBottom: spacing['3xl'],
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
  checkboxLabel: {
    flex: 1,
  },
  button: {
    width: '100%',
  },
  buttonDesktop: {
    maxWidth: 360,
  },
});
