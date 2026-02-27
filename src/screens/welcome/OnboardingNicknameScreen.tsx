import React, { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, fonts, fontSize } from '../../theme';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { HollowText } from '../../components/common/HollowText';
import { AmberButton } from '../../components/common/AmberButton';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useI18n } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import type { RootStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OnboardingNickname'>;

export function OnboardingNicknameScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const { isDesktop } = useResponsive();
  const setNickname = useSettingsStore((s) => s.setNickname);
  const [name, setName] = useState('');

  const handleContinue = () => {
    if (name.trim()) {
      setNickname(name.trim());
      navigation.navigate('OnboardingStyle');
    }
  };

  return (
    <ScreenContainer>
      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        <HollowText variant="heading" center style={styles.title}>
          {t('onboarding.nickname.title')}
        </HollowText>
        <HollowText variant="body" color={colors.textSecondary} center style={styles.subtitle}>
          {t('onboarding.nickname.subtitle')}
        </HollowText>
        <TextInput
          style={[styles.input, isDesktop && styles.inputDesktop]}
          value={name}
          onChangeText={setName}
          placeholder={t('onboarding.nickname.placeholder')}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.amber}
          autoFocus
          maxLength={20}
        />
      </View>
      <View style={[styles.bottom, isDesktop && styles.bottomDesktop]}>
        <AmberButton
          title={t('onboarding.nickname.continue')}
          onPress={handleContinue}
          disabled={!name.trim()}
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
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    marginBottom: spacing.md,
  },
  subtitle: {
    marginBottom: spacing['4xl'],
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: colors.amber,
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontFamily: fonts.serif,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  inputDesktop: {
    maxWidth: 360,
    alignSelf: 'center',
    width: '100%',
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
