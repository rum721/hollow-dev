import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { HollowText } from '../../components/common/HollowText';
import { MemoryCategoryCard } from '../../components/memory/MemoryCategoryCard';
import { AddMemoryButton } from '../../components/memory/AddMemoryButton';
import { useMemoryStore } from '../../store/useMemoryStore';
import { useI18n } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, spacing } from '../../theme';
import type { MemoryStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MemoryStackParamList, 'MemoryList'>;

export function MemoryScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const memories = useMemoryStore((s) => s.memories);
  const deleteMemory = useMemoryStore((s) => s.deleteMemory);
  const { isDesktop } = useResponsive();

  const people = memories.filter((m) => m.category === 'people');
  const events = memories.filter((m) => m.category === 'events');
  const preferences = memories.filter((m) => m.category === 'preferences');
  const isEmpty = memories.length === 0;

  const handleEdit = (id: string) => {
    navigation.navigate('MemoryEdit', { memoryId: id });
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
          <HollowText variant="heading" style={[styles.title, isDesktop && styles.titleDesktop]}>
            {t('memory.title')}
          </HollowText>

          {isEmpty ? (
            <View style={styles.empty}>
              <Feather name="database" size={48} color={colors.textMuted} />
              <HollowText variant="body" color={colors.textSecondary} center style={styles.emptyText}>
                {t('memory.empty')}
              </HollowText>
              <HollowText variant="caption" center>
                {t('memory.emptyHint')}
              </HollowText>
            </View>
          ) : (
            <>
              <MemoryCategoryCard title={t('memory.people')} entries={people} onEdit={handleEdit} onDelete={deleteMemory} />
              <MemoryCategoryCard title={t('memory.events')} entries={events} onEdit={handleEdit} onDelete={deleteMemory} />
              <MemoryCategoryCard title={t('memory.preferences')} entries={preferences} onEdit={handleEdit} onDelete={deleteMemory} />
            </>
          )}

          <View style={styles.addArea}>
            <AddMemoryButton onPress={() => navigation.navigate('MemoryEdit', {})} />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.lg,
    paddingBottom: 120,
  },
  inner: {
    width: '100%',
  },
  innerDesktop: {
    maxWidth: 680,
    alignSelf: 'center',
    paddingTop: spacing.xl,
  },
  title: {
    marginBottom: spacing.xl,
  },
  titleDesktop: {
    marginBottom: spacing['2xl'],
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing['5xl'],
    gap: spacing.md,
  },
  emptyText: {
    marginTop: spacing.sm,
  },
  addArea: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
});
