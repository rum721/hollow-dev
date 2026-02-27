import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius } from '../../theme';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { HollowText } from '../../components/common/HollowText';
import { AmberButton } from '../../components/common/AmberButton';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useI18n } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import type { ConversationStyle } from '../../types/settings';
import type { RootStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OnboardingStyle'>;

const STYLES: { key: ConversationStyle; labelKey: string; descKey: string }[] = [
  { key: 'empathetic', labelKey: 'onboarding.style.empathetic', descKey: 'onboarding.style.empatheticDesc' },
  { key: 'analytical', labelKey: 'onboarding.style.analytical', descKey: 'onboarding.style.analyticalDesc' },
  { key: 'balanced', labelKey: 'onboarding.style.balanced', descKey: 'onboarding.style.balancedDesc' },
];

export function OnboardingStyleScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const { isDesktop } = useResponsive();
  const setConversationStyle = useSettingsStore((s) => s.setConversationStyle);
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const [selected, setSelected] = useState<ConversationStyle>('empathetic');

  const handleStart = () => {
    setConversationStyle(selected);
    setOnboarded(true);
  };

  return (
    <ScreenContainer>
      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        <HollowText variant="heading" center style={styles.title}>
          {t('onboarding.style.title')}
        </HollowText>
        <HollowText variant="body" color={colors.textSecondary} center style={styles.subtitle}>
          {t('onboarding.style.subtitle')}
        </HollowText>
        <View style={styles.options}>
          {STYLES.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.option, selected === item.key && styles.optionSelected]}
              onPress={() => setSelected(item.key)}
              activeOpacity={0.7}
            >
              <HollowText
                variant="subheading"
                serif
                color={selected === item.key ? colors.amber : colors.textPrimary}
              >
                {t(item.labelKey)}
              </HollowText>
              <HollowText variant="caption" style={styles.desc}>
                {t(item.descKey)}
              </HollowText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={[styles.bottom, isDesktop && styles.bottomDesktop]}>
        <AmberButton
          title={t('onboarding.style.start')}
          onPress={handleStart}
          variant="filled"
          style={isDesktop ? styles.buttonDesktop : undefined}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  contentDesktop: {
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    marginBottom: spacing.md,
  },
  subtitle: {
    marginBottom: spacing['3xl'],
  },
  options: {
    gap: spacing.md,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.amber,
    backgroundColor: colors.amberMuted,
  },
  desc: {
    marginTop: spacing.xs,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  bottomDesktop: {
    alignItems: 'center',
    paddingBottom: spacing['3xl'],
  },
  buttonDesktop: {
    maxWidth: 360,
    width: '100%',
  },
});
