import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CardContainer } from '../common/CardContainer';
import { HollowText } from '../common/HollowText';
import { MemoryEntryRow } from './MemoryEntryRow';
import { colors, spacing } from '../../theme';
import type { MemoryEntry } from '../../types/memory';

interface Props {
  title: string;
  entries: MemoryEntry[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function MemoryCategoryCard({ title, entries, onEdit, onDelete }: Props) {
  if (entries.length === 0) return null;

  return (
    <CardContainer highlighted style={styles.card}>
      <HollowText variant="subheading" serif color={colors.amber} style={styles.title}>
        {title}
      </HollowText>
      {entries.map((entry, index) => (
        <View key={entry.id}>
          {index > 0 && <View style={styles.divider} />}
          <MemoryEntryRow entry={entry} onEdit={() => onEdit(entry.id)} onDelete={() => onDelete(entry.id)} />
        </View>
      ))}
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
});
