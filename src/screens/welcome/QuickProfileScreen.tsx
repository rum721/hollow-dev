import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { HollowText } from '../../components/common/HollowText';
import { AmberButton } from '../../components/common/AmberButton';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { useMemoryStore } from '../../store/useMemoryStore';
import { useI18n, getEffectiveLocale } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import * as profileRepo from '../../services/storage/profileRepo';
import * as episodeRepo from '../../services/storage/episodeRepo';

interface ImportantPerson {
  name: string;
  relationship: string;
}

const RELATIONSHIP_OPTIONS = ['家人', '朋友', '伴侣', '同事', '宠物', '其他'];
const MOOD_OPTIONS = [
  { key: 'good', label: '还不错', emoji: '' },
  { key: 'ok', label: '一般般', emoji: '' },
  { key: 'bad', label: '有点烦', emoji: '' },
  { key: 'down', label: '很低落', emoji: '' },
];

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

export function QuickProfileScreen() {
  const navigation = useNavigation();
  const { t } = useI18n();
  const { isDesktop } = useResponsive();

  const nickname = useSettingsStore((s) => s.nickname) || '';
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [job, setJob] = useState('');
  const [bio, setBio] = useState('');
  const [mood, setMood] = useState('');
  const [people, setPeople] = useState<ImportantPerson[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addPerson = () => {
    Haptics.selectionAsync();
    setPeople([...people, { name: '', relationship: '朋友' }]);
  };

  const removePerson = (idx: number) => {
    Haptics.selectionAsync();
    setPeople(people.filter((_, i) => i !== idx));
  };

  const updatePerson = (idx: number, field: 'name' | 'relationship', value: string) => {
    const updated = [...people];
    updated[idx] = { ...updated[idx], [field]: value };
    setPeople(updated);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Save profiles
      if (age.trim()) {
        await profileRepo.upsertProfile({
          key: 'age', category: 'identity', title: '年龄',
          content: `${age}岁`, confidence: 0.9, mentionCount: 1,
        });
      }
      if (city.trim()) {
        await profileRepo.upsertProfile({
          key: 'city', category: 'identity', title: '所在城市',
          content: city.trim(), confidence: 0.9, mentionCount: 1,
        });
      }
      if (job.trim()) {
        await profileRepo.upsertProfile({
          key: 'job', category: 'identity', title: '职业',
          content: job.trim(), confidence: 0.9, mentionCount: 1,
        });
      }
      if (bio.trim()) {
        await profileRepo.upsertProfile({
          key: 'self_intro', category: 'trait', title: '自我介绍',
          content: bio.trim(), confidence: 0.9, mentionCount: 1,
        });
      }

      // Save important people
      for (const person of people) {
        if (person.name.trim()) {
          const key = person.name.trim().toLowerCase().replace(/\s+/g, '_');
          await profileRepo.upsertProfile({
            key,
            category: 'relationship',
            title: person.name.trim(),
            content: person.relationship,
            confidence: 0.9,
            mentionCount: 1,
          });
        }
      }

      // Save mood as episodic memory
      if (mood) {
        const moodMap: Record<string, string> = {
          good: '最近心情还不错', ok: '最近心情一般',
          bad: '最近有点烦', down: '最近心情很低落',
        };
        const emotionMap: Record<string, string> = {
          good: 'happy', ok: 'neutral', bad: 'frustrated', down: 'sad',
        };
        await episodeRepo.insertEpisode({
          sessionId: null,
          content: moodMap[mood] || '心情一般',
          emotion: (emotionMap[mood] || 'neutral') as any,
          intensity: mood === 'down' ? 4 : mood === 'bad' ? 3 : 2,
          eventDate: new Date().toISOString().split('T')[0],
          decayWeight: 1.0,
        });
      }

      // Invalidate memory cache
      useMemoryStore.getState().invalidateCache();
      await useMemoryStore.getState().loadAll();

      // Finish onboarding
      const settings = useSettingsStore.getState();
      const locale = getEffectiveLocale(settings.language);
      const greeting = GREETINGS[settings.conversationStyle]?.[locale] || GREETINGS.balanced[locale];
      const nick = settings.nickname || (locale === 'zh' ? '你' : 'friend');
      const personalizedGreeting = greeting.replace('{nickname}', nick);

      const sessionId = await useChatStore.getState().createSession();
      useChatStore.getState().finalizeAssistantMessage(sessionId, personalizedGreeting);
      useAuthStore.getState().setOnboarded(true);
    } catch (e: any) {
      console.error('QuickProfile submit failed:', e);
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <HollowText variant="subheading" serif>
          {t('memory.onboardingFillProfile')}
        </HollowText>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nickname (read-only display) */}
        <View style={styles.fieldGroup}>
          <HollowText variant="caption" color={colors.textMuted} style={styles.fieldLabel}>
            {t('settings.nickname')}
          </HollowText>
          <View style={[styles.input, styles.inputDisabled]}>
            <HollowText variant="body" color={colors.textSecondary}>{nickname}</HollowText>
          </View>
        </View>

        {/* Age */}
        <View style={styles.fieldGroup}>
          <HollowText variant="caption" color={colors.textMuted} style={styles.fieldLabel}>
            {t('quickProfile.age')}
          </HollowText>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            placeholder={t('quickProfile.agePlaceholder')}
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            selectionColor={colors.amber}
          />
        </View>

        {/* City */}
        <View style={styles.fieldGroup}>
          <HollowText variant="caption" color={colors.textMuted} style={styles.fieldLabel}>
            {t('quickProfile.city')}
          </HollowText>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder={t('quickProfile.cityPlaceholder')}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.amber}
          />
        </View>

        {/* Job */}
        <View style={styles.fieldGroup}>
          <HollowText variant="caption" color={colors.textMuted} style={styles.fieldLabel}>
            {t('quickProfile.job')}
          </HollowText>
          <TextInput
            style={styles.input}
            value={job}
            onChangeText={setJob}
            placeholder={t('quickProfile.jobPlaceholder')}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.amber}
          />
        </View>

        {/* Bio */}
        <View style={styles.fieldGroup}>
          <HollowText variant="caption" color={colors.textMuted} style={styles.fieldLabel}>
            {t('quickProfile.bio')}
          </HollowText>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder={t('quickProfile.bioPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            selectionColor={colors.amber}
          />
        </View>

        {/* Important People */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeader}>
            <HollowText variant="caption" color={colors.textMuted}>
              {t('quickProfile.importantPeople')}
            </HollowText>
            <TouchableOpacity onPress={addPerson} style={styles.addBtn}>
              <Feather name="plus" size={16} color={colors.amber} />
              <HollowText variant="label" color={colors.amber}> {t('quickProfile.add')}</HollowText>
            </TouchableOpacity>
          </View>
          {people.map((person, idx) => (
            <View key={idx} style={styles.personRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={person.name}
                onChangeText={(val) => updatePerson(idx, 'name', val)}
                placeholder={t('quickProfile.namePlaceholder')}
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.amber}
              />
              <View style={styles.relationshipPicker}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {RELATIONSHIP_OPTIONS.map((rel) => (
                    <TouchableOpacity
                      key={rel}
                      style={[styles.relChip, person.relationship === rel && styles.relChipActive]}
                      onPress={() => updatePerson(idx, 'relationship', rel)}
                    >
                      <HollowText
                        variant="label"
                        color={person.relationship === rel ? colors.amber : colors.textSecondary}
                      >
                        {rel}
                      </HollowText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <TouchableOpacity onPress={() => removePerson(idx)} style={styles.removeBtn}>
                <Feather name="x" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Current Mood */}
        <View style={styles.fieldGroup}>
          <HollowText variant="caption" color={colors.textMuted} style={styles.fieldLabel}>
            {t('quickProfile.mood')}
          </HollowText>
          <View style={styles.moodRow}>
            {MOOD_OPTIONS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.moodChip, mood === m.key && styles.moodChipActive]}
                onPress={() => { Haptics.selectionAsync(); setMood(mood === m.key ? '' : m.key); }}
              >
                <HollowText
                  variant="caption"
                  color={mood === m.key ? colors.amber : colors.textSecondary}
                >
                  {m.label}
                </HollowText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottom, isDesktop && styles.bottomDesktop]}>
        <AmberButton
          title={t('common.done')}
          onPress={handleSubmit}
          variant="filled"
          loading={submitting}
          style={isDesktop ? { maxWidth: 360, width: '100%' } : undefined}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    paddingTop: spacing.md,
  },
  scrollDesktop: {
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  fieldGroup: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    marginBottom: spacing.xs,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    backgroundColor: colors.surface,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personRow: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  relationshipPicker: {
    marginTop: 4,
  },
  relChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  relChipActive: {
    borderColor: colors.amber,
    backgroundColor: colors.amberMuted,
  },
  removeBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: spacing.sm,
  },
  moodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  moodChip: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  moodChipActive: {
    borderColor: colors.amber,
    backgroundColor: colors.amberMuted,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  bottomDesktop: {
    alignItems: 'center',
    paddingBottom: spacing['3xl'],
  },
});
