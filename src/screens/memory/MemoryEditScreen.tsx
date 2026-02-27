import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { HollowText } from '../../components/common/HollowText';
import { AmberButton } from '../../components/common/AmberButton';
import { CardContainer } from '../../components/common/CardContainer';
import { useMemoryStore } from '../../store/useMemoryStore';
import { useI18n } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import type { MemoryCategory } from '../../types/memory';
import type { MemoryStackParamList } from '../../types/navigation';

type RouteType = RouteProp<MemoryStackParamList, 'MemoryEdit'>;

const CATEGORIES: MemoryCategory[] = ['people', 'events', 'preferences'];

export function MemoryEditScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { t } = useI18n();
  const { isDesktop } = useResponsive();
  const memoryId = route.params?.memoryId;
  const existing = useMemoryStore((s) => s.memories.find((m) => m.id === memoryId));
  const addMemory = useMemoryStore((s) => s.addMemory);
  const updateMemory = useMemoryStore((s) => s.updateMemory);

  const [category, setCategory] = useState<MemoryCategory>(existing?.category ?? 'people');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [content, setContent] = useState(existing?.content ?? '');

  const isEdit = !!memoryId;
  const canSave = title.trim().length > 0;

  const categoryLabels: Record<MemoryCategory, string> = {
    people: t('memory.people'),
    events: t('memory.events'),
    preferences: t('memory.preferences'),
  };

  const handleSave = () => {
    if (!canSave) return;
    if (isEdit && memoryId) {
      updateMemory(memoryId, { category, title: title.trim(), content: content.trim() });
    } else {
      addMemory(category, title.trim(), content.trim());
    }
    navigation.goBack();
  };

  return (
    <ScreenContainer>
      <View style={[styles.wrapper, isDesktop && styles.wrapperDesktop]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <HollowText variant="subheading" serif>
            {isEdit ? t('memory.editMemory') : t('memory.addMemory')}
          </HollowText>
        </View>

        <View style={styles.form}>
          <HollowText variant="caption" style={styles.label}>{t('memory.category')}</HollowText>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                onPress={() => setCategory(cat)}
              >
                <HollowText
                  variant="caption"
                  color={category === cat ? colors.amber : colors.textSecondary}
                >
                  {categoryLabels[cat]}
                </HollowText>
              </TouchableOpacity>
            ))}
          </View>

          <HollowText variant="caption" style={styles.label}>{t('memory.memoryTitle')}</HollowText>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.amber}
            maxLength={50}
          />

          <HollowText variant="caption" style={styles.label}>{t('memory.content')}</HollowText>
          <TextInput
            style={[styles.input, styles.contentInput]}
            value={content}
            onChangeText={setContent}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.amber}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.bottom}>
          <AmberButton title={t('memory.save')} onPress={handleSave} disabled={!canSave} variant="filled" />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  wrapperDesktop: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  form: {
    flex: 1,
  },
  label: {
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryChipActive: {
    borderColor: colors.amber,
    backgroundColor: colors.amberMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    backgroundColor: colors.surface,
  },
  contentInput: {
    minHeight: 100,
  },
  bottom: {
    paddingVertical: spacing.xl,
  },
});
