import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { HollowText } from '../../components/common/HollowText';
import { useChatStore } from '../../store/useChatStore';
import { useI18n } from '../../i18n';
import { colors, spacing, borderRadius } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';
import { formatDate, truncate } from '../../utils/formatters';
import type { ChatStackParamList } from '../../types/navigation';
import type { Session } from '../../types/chat';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatList'>;

export function ChatListScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const sessions = useChatStore((s) => s.sessions);
  const createSession = useChatStore((s) => s.createSession);
  const { isDesktop } = useResponsive();

  const handleNewSession = () => {
    const id = createSession();
    navigation.navigate('ChatSession', { sessionId: id });
  };

  const handleOpenSession = (sessionId: string) => {
    navigation.navigate('ChatSession', { sessionId });
  };

  const renderSession = ({ item }: { item: Session }) => (
    <TouchableOpacity
      style={[styles.sessionCard, isDesktop && styles.sessionCardDesktop]}
      onPress={() => handleOpenSession(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.sessionHeader}>
        <HollowText variant="body" serif color={colors.textPrimary}>
          {item.title}
        </HollowText>
        <HollowText variant="label">{formatDate(item.updatedAt)}</HollowText>
      </View>
      {item.lastMessage && (
        <HollowText variant="caption" style={styles.preview}>
          {truncate(item.lastMessage, 60)}
        </HollowText>
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <HollowText variant="heading">{t('tabs.chat')}</HollowText>
      </View>
      {sessions.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="message-circle" size={48} color={colors.textMuted} />
          <HollowText variant="body" color={colors.textSecondary} center style={styles.emptyText}>
            {t('chat.noSessions')}
          </HollowText>
          <HollowText variant="caption" center>
            {t('chat.noSessionsHint')}
          </HollowText>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSession}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
      <TouchableOpacity
        style={[styles.fab, isDesktop && styles.fabDesktop]}
        onPress={handleNewSession}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color={colors.background} />
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  list: {
    paddingBottom: 100,
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    marginTop: spacing.sm,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    marginTop: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // Desktop overrides
  headerDesktop: {
    paddingTop: spacing['2xl'],
  },
  sessionCardDesktop: {
    maxWidth: 600,
  },
  fabDesktop: {
    bottom: 32,
    right: 32,
  },
});
