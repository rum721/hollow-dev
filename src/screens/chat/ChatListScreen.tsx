import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { HollowText } from '../../components/common/HollowText';
import { useChatStore } from '../../store/useChatStore';
import { useI18n } from '../../i18n';
import { colors, spacing, borderRadius } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';
import { formatDate, truncate } from '../../utils/formatters';
import type { ChatStackParamList } from '../../types/navigation';
import type { Session } from '../../types/chat';

/* ── Ink-dissolve animated wrapper for session cards ── */
const INK_DISSOLVE_DURATION = 600;
const INK_DISSOLVE_EASING = Easing.in(Easing.ease);

function AnimatedSessionCard({
  session,
  isDestroying,
  onDestroyAnimationComplete,
  onPress,
  onLongPress,
  onArchive,
  isDesktop,
}: {
  session: Session;
  isDestroying: boolean;
  onDestroyAnimationComplete: () => void;
  onPress: () => void;
  onLongPress: () => void;
  onArchive: () => void;
  isDesktop: boolean;
}) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    if (isDestroying) {
      const timingConfig = { duration: INK_DISSOLVE_DURATION, easing: INK_DISSOLVE_EASING };

      opacity.value = withTiming(0, timingConfig);
      scale.value = withTiming(0.95, timingConfig);
      translateY.value = withTiming(20, {
        ...timingConfig,
        // Fire the removal callback once the last animation finishes
      }, (finished) => {
        if (finished) {
          runOnJS(onDestroyAnimationComplete)();
        }
      });
    }
  }, [isDestroying]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.sessionCard, isDesktop && styles.sessionCardDesktop]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
      >
        <View style={styles.sessionHeader}>
          <View style={{ flex: 1 }}>
            <HollowText variant="body" color={colors.textPrimary}>
              {session.title}
            </HollowText>
          </View>
          <View style={styles.sessionActions}>
            <HollowText variant="label">{formatDate(session.updatedAt)}</HollowText>
            <TouchableOpacity
              onPress={onArchive}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="archive" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
        {session.lastMessage && (
          <HollowText variant="caption" style={styles.preview}>
            {truncate(session.lastMessage, 60)}
          </HollowText>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatList'>;

export function ChatListScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const sessions = useChatStore((s) => s.sessions);
  const createSession = useChatStore((s) => s.createSession);
  const archiveSession = useChatStore((s) => s.archiveSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const destroySession = useChatStore((s) => s.destroySession);
  const { isDesktop } = useResponsive();

  // Track which session is currently playing the ink-dissolve animation
  const [destroyingId, setDestroyingId] = useState<string | null>(null);

  // ── Search state ──
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSearch = sessions.length >= 3;

  // Debounce search input by 300ms
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchText]);

  // Filter sessions by title and lastMessage (case insensitive, supports Chinese + English)
  const filteredSessions = useMemo(() => {
    if (!debouncedSearch.trim()) return sessions;
    const query = debouncedSearch.toLowerCase();
    return sessions.filter((s) => {
      const titleMatch = s.title?.toLowerCase().includes(query);
      const messageMatch = s.lastMessage?.toLowerCase().includes(query);
      return titleMatch || messageMatch;
    });
  }, [sessions, debouncedSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchText('');
    setDebouncedSearch('');
  }, []);

  const handleNewSession = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const id = await createSession();
    navigation.navigate('ChatSession', { sessionId: id });
  };

  const handleOpenSession = (sessionId: string) => {
    navigation.navigate('ChatSession', { sessionId });
  };

  const handleArchive = useCallback((id: string) => {
    archiveSession(id);
  }, [archiveSession]);

  // Begin the ink-dissolve animation instead of immediately destroying
  const startDestroyAnimation = useCallback((id: string) => {
    setDestroyingId(id);
  }, []);

  // Called when the ink-dissolve animation finishes — actually remove the session
  const handleDestroyAnimationComplete = useCallback(() => {
    if (destroyingId) {
      destroySession(destroyingId);
      setDestroyingId(null);
    }
  }, [destroyingId, destroySession]);

  const handleDestroy = useCallback((id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('chat.destroyConfirm'))) {
        startDestroyAnimation(id);
      }
    } else {
      Alert.alert(
        t('chat.destroySession'),
        t('chat.destroyConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('chat.destroy'), style: 'destructive', onPress: () => startDestroyAnimation(id) },
        ],
      );
    }
  }, [startDestroyAnimation, t]);

  const renderRightActions = (sessionId: string) => (
    <TouchableOpacity
      style={styles.swipeDeleteBtn}
      onPress={() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        deleteSession(sessionId);
      }}
    >
      <Feather name="trash-2" size={20} color="#fff" />
    </TouchableOpacity>
  );

  const renderSession = ({ item }: { item: Session }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item.id)}
      overshootRight={false}
    >
      <AnimatedSessionCard
        session={item}
        isDestroying={destroyingId === item.id}
        onDestroyAnimationComplete={handleDestroyAnimationComplete}
        onPress={() => handleOpenSession(item.id)}
        onLongPress={() => handleDestroy(item.id)}
        onArchive={() => handleArchive(item.id)}
        isDesktop={isDesktop}
      />
    </Swipeable>
  );

  return (
    <ScreenContainer>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <HollowText variant="heading">{t('tabs.chat')}</HollowText>
      </View>
      {showSearch && (
        <View style={styles.searchContainer}>
          <Feather name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('chat.searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            selectionColor={colors.amber}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearButton}
            >
              <Feather name="x" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}
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
      ) : filteredSessions.length === 0 ? (
        <View style={styles.noResults}>
          <Feather name="search" size={36} color={colors.textMuted} />
          <HollowText variant="body" color={colors.textSecondary} center style={styles.noResultsText}>
            {t('chat.noResults')}
          </HollowText>
        </View>
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSession}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          windowSize={5}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS === 'android'}
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
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(212, 165, 116, 0.3)',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  clearButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  noResultsText: {
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
  swipeDeleteBtn: {
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
});
