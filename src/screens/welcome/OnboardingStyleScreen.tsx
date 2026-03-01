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
import { useChatStore } from '../../store/useChatStore';
import { useI18n, getEffectiveLocale } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import type { ConversationStyle } from '../../types/settings';
import type { RootStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OnboardingStyle'>;

const STYLES: { key: ConversationStyle; labelKey: string; descKey: string }[] = [
  { key: 'empathetic', labelKey: 'onboarding.style.empathetic', descKey: 'onboarding.style.empatheticDesc' },
  { key: 'analytical', labelKey: 'onboarding.style.analytical', descKey: 'onboarding.style.analyticalDesc' },
  { key: 'balanced', labelKey: 'onboarding.style.balanced', descKey: 'onboarding.style.balancedDesc' },
];

const GREETINGS: Record<ConversationStyle, Record<'zh' | 'en', string>> = {
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

function buildGreeting(style: ConversationStyle, nickname: string, locale: 'zh' | 'en'): string {
  return GREETINGS[style][locale].replace('{nickname}', nickname || (locale === 'zh' ? '你' : 'friend'));
}

export function OnboardingStyleScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const { isDesktop } = useResponsive();
  const setConversationStyle = useSettingsStore((s) => s.setConversationStyle);
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const [selected, setSelected] = useState<ConversationStyle>('empathetic');

  const [starting, setStarting] = useState(false);

  const handleStart = () => {
    if (starting) return; // prevent double-tap
    setStarting(true);
    setConversationStyle(selected);
    // Navigate to the profile step (where user can fill profile, import, or skip)
    navigation.navigate('OnboardingProfile');
    setStarting(false);
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
