import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { HollowText } from '../../components/common/HollowText';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useI18n, getEffectiveLocale } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, spacing, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OnboardingProfile'>;

const GREETINGS: Record<string, Record<'zh' | 'en', string>> = {
  empathetic: {
    zh: '嘿 {nickname}，很高兴认识你。\n\n这里是属于你的私密空间。无论是开心的、难过的、纠结的，或者只是想找个人说说话——我都在这里。\n\n想聊点什么吗？',
    en: 'Hey {nickname}, nice to meet you.\n\nThis is your private space. Whether you\'re happy, sad, conflicted, or just need someone to talk to — I\'m here.\n\nWhat\'s on your mind?',
  },
  analytical: {
    zh: '{nickname}，欢迎来到留白。\n\n这个空间是为你准备的——无论是理清思路、分析决策，还是倾诉情绪，我都可以帮你梳理。\n\n有什么想聊的？',
    en: '{nickname}, welcome to Hollow.\n\nThis space is yours — whether you need to organize your thoughts, analyze a decision, or process emotions, I can help you work through it.\n\nWhat would you like to explore?',
  },
  balanced: {
    zh: '{nickname}，你好。\n\n我是留白，你的私密思维伙伴。这里没有评判，只有倾听和对话。\n\n随时开始吧。',
    en: '{nickname}, hello.\n\nI\'m Hollow, your private thinking companion. No judgment here, just listening and conversation.\n\nStart whenever you\'re ready.',
  },
};

export function OnboardingProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const { isDesktop } = useResponsive();

  const finishOnboarding = async () => {
    const settings = useSettingsStore.getState();
    const locale = getEffectiveLocale(settings.language);
    const greeting = GREETINGS[settings.conversationStyle]?.[locale] || GREETINGS.balanced[locale];
    const nickname = settings.nickname || (locale === 'zh' ? '你' : 'friend');
    const personalizedGreeting = greeting.replace('{nickname}', nickname);

    const sessionId = await useChatStore.getState().createSession();
    useChatStore.getState().finalizeAssistantMessage(sessionId, personalizedGreeting);
    useAuthStore.getState().setOnboarded(true);
  };

  const handleFillProfile = () => {
    Haptics.selectionAsync();
    navigation.navigate('QuickProfile' as any);
  };

  const handleImportFile = () => {
    Haptics.selectionAsync();
    navigation.navigate('OnboardingImport' as any);
  };

  const handleSkip = async () => {
    Haptics.selectionAsync();
    await finishOnboarding();
  };

  const OPTIONS = [
    {
      icon: 'edit-3' as const,
      labelKey: 'memory.onboardingFillProfile',
      descKey: 'memory.onboardingFillProfileDesc',
      onPress: handleFillProfile,
    },
    {
      icon: 'file-text' as const,
      labelKey: 'memory.onboardingImportFile',
      descKey: 'memory.onboardingImportFileDesc',
      onPress: handleImportFile,
    },
    {
      icon: 'skip-forward' as const,
      labelKey: 'memory.onboardingSkip',
      descKey: 'memory.onboardingSkipDesc',
      onPress: handleSkip,
    },
  ];

  return (
    <ScreenContainer>
      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        <HollowText variant="heading" center style={styles.title}>
          {t('memory.onboardingProfileTitle')}
        </HollowText>
        <HollowText variant="body" color={colors.textSecondary} center style={styles.subtitle}>
          {t('memory.onboardingProfileSubtitle')}
        </HollowText>

        <View style={styles.options}>
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.labelKey}
              style={styles.optionCard}
              onPress={opt.onPress}
              activeOpacity={0.7}
            >
              <Feather name={opt.icon as any} size={22} color={colors.amber} style={styles.optionIcon} />
              <View style={styles.optionText}>
                <HollowText variant="subheading" serif color={colors.textPrimary}>
                  {t(opt.labelKey)}
                </HollowText>
                <HollowText variant="caption" color={colors.textSecondary} style={styles.optionDesc}>
                  {t(opt.descKey)}
                </HollowText>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
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
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  optionIcon: {
    marginRight: spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionDesc: {
    marginTop: 2,
  },
});
