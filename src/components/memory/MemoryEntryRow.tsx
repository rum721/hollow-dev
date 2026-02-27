import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { HollowText } from '../common/HollowText';
import { colors, spacing } from '../../theme';
import type { MemoryEntry } from '../../types/memory';

interface Props {
  entry: MemoryEntry;
  onEdit: () => void;
  onDelete: () => void;
}

export function MemoryEntryRow({ entry, onEdit, onDelete }: Props) {
  const icon = entry.category === 'people' ? 'user' : entry.category === 'events' ? 'calendar' : 'star';

  return (
    <View style={styles.row}>
      <Feather name={icon} size={16} color={colors.amber} style={styles.icon} />
      <HollowText variant="body" style={styles.title} numberOfLines={1}>
        {entry.title}
      </HollowText>
      <TouchableOpacity onPress={onEdit} style={styles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="edit-2" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="trash-2" size={16} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  icon: {
    marginRight: spacing.md,
  },
  title: {
    flex: 1,
  },
  actionBtn: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});
