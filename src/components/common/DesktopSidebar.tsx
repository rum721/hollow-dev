import React from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { HollowText } from './HollowText';
import { colors, spacing, borderRadius } from '../../theme';
import { useChatStore } from '../../store/useChatStore';
import { useI18n } from '../../i18n';
import { formatDate, truncate } from '../../utils/formatters';
import type { Session } from '../../types/chat';

interface Props {
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  activeSessionId: string | null;
}

export function DesktopSidebar({ onSelectSession, onNewSession, activeSessionId }: Props) {
  const sessions = useChatStore((s) => s.sessions);
  const { t } = useI18n();

  const renderSession = ({ item }: { item: Session }) => (
    <TouchableOpacity
      style={[styles.sessionItem, item.id === activeSessionId && styles.sessionActive]}
      onPress={() => onSelectSession(item.id)}
      activeOpacity={0.7}
    >
      <HollowText
        variant="body"
        color={item.id === activeSessionId ? colors.amber : colors.textPrimary}
        numberOfLines={1}
      >
        {item.title}
      </HollowText>
      {item.lastMessage && (
        <HollowText variant="label" numberOfLines={1} style={styles.preview}>
          {truncate(item.lastMessage, 40)}
        </HollowText>
      )}
      <HollowText variant="label" style={styles.date}>
        {formatDate(item.updatedAt)}
      </HollowText>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <HollowText variant="subheading" serif color={colors.amber}>
          Hollow
        </HollowText>
        <TouchableOpacity onPress={onNewSession} style={styles.newBtn}>
          <Feather name="plus" size={18} color={colors.amber} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderSession}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <HollowText variant="caption" center>
              {t('chat.noSessions')}
            </HollowText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 280,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  newBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: spacing.sm,
  },
  sessionItem: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: 2,
  },
  sessionActive: {
    backgroundColor: colors.amberMuted,
  },
  preview: {
    marginTop: 2,
  },
  date: {
    marginTop: 4,
  },
  empty: {
    paddingTop: spacing['3xl'],
  },
});
