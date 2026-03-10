import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { HollowText } from '../../components/common/HollowText';
import { CardContainer } from '../../components/common/CardContainer';
import { AddMemoryButton } from '../../components/memory/AddMemoryButton';
import { useMemoryStore } from '../../store/useMemoryStore';
import { useI18n } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, spacing } from '../../theme';
import { EMOTION_LABELS } from '../../services/ai/synonymDict';
import { humanizeKey } from '../../utils/memoryLabels';
import type { MemoryStackParamList } from '../../types/navigation';
import type { CoreProfile, ProfileCategory, EpisodicMemory } from '../../types/memory';

type Nav = NativeStackNavigationProp<MemoryStackParamList, 'MemoryList'>;

// ── Emotion tag colors ──
const EMOTION_COLORS: Record<string, string> = {
  happy: colors.amber,
  excited: colors.amber,
  sad: '#6B8DB5',
  frustrated: '#6B8DB5',
  anxious: '#C45C5C',
  angry: '#C45C5C',
  calm: '#5C8A6E',
  hopeful: '#5C8A6E',
  neutral: colors.textSecondary,
  mixed: colors.textSecondary,
};

// ── Date grouping helper ──
function getDateGroupLabel(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((nowDay.getTime() - dDay.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// ── Confidence indicator ──
function ConfidenceDot({ confidence }: { confidence: number }) {
  const opacity = Math.max(0.3, Math.min(1, confidence));
  return (
    <View style={[styles.confidenceDot, { opacity, backgroundColor: colors.amber }]} />
  );
}

// ── Collapsible section header ──
function SectionHeader({
  title,
  collapsed,
  onToggle,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const rotation = useSharedValue(collapsed ? -90 : 0);

  React.useEffect(() => {
    rotation.value = withTiming(collapsed ? -90 : 0, { duration: 200 });
  }, [collapsed]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <TouchableOpacity onPress={onToggle} style={styles.sectionHeader} activeOpacity={0.7}>
      <HollowText variant="subheading" serif color={colors.amber} style={styles.sectionTitle}>
        {title}
      </HollowText>
      <Animated.View style={chevronStyle}>
        <Feather name="chevron-down" size={16} color={colors.textMuted} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Expandable profile row ──
function ProfileRow({
  profile,
  onDelete,
}: {
  profile: CoreProfile;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
      style={styles.profileRow}
    >
      <ConfidenceDot confidence={profile.confidence} />
      <View style={styles.profileContent}>
        <HollowText variant="body" numberOfLines={1} style={styles.profileTitle}>
          {humanizeKey(profile.key || profile.title)}
        </HollowText>
        <HollowText
          variant="caption"
          color={colors.textSecondary}
          numberOfLines={expanded ? undefined : 1}
        >
          {profile.content}
        </HollowText>
        {expanded && (
          <TouchableOpacity
            onPress={onDelete}
            style={styles.removeLink}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <HollowText variant="caption" color={colors.danger}>
              移除这条记忆
            </HollowText>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Expandable episode row ──
function EpisodeRow({
  episode,
  onDelete,
}: {
  episode: EpisodicMemory;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
      style={[styles.episodeRow, { opacity: Math.max(0.4, episode.decayWeight) }]}
    >
      <View style={styles.episodeCenter}>
        <HollowText
          variant="body"
          color={colors.textPrimary}
          numberOfLines={expanded ? undefined : 2}
          style={styles.episodeContent}
        >
          {episode.content}
        </HollowText>
        {episode.emotion !== 'neutral' && (
          <View style={[styles.emotionTag, { backgroundColor: `${EMOTION_COLORS[episode.emotion] || colors.textSecondary}20` }]}>
            <HollowText
              variant="caption"
              color={EMOTION_COLORS[episode.emotion] || colors.textSecondary}
              style={styles.emotionText}
            >
              {EMOTION_LABELS[episode.emotion] || episode.emotion}
            </HollowText>
          </View>
        )}
        {expanded && (
          <TouchableOpacity
            onPress={onDelete}
            style={styles.removeLink}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <HollowText variant="caption" color={colors.danger}>
              移除这条记忆
            </HollowText>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function MemoryScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const { isDesktop } = useResponsive();

  const profiles = useMemoryStore((s) => s.profiles);
  const episodes = useMemoryStore((s) => s.episodes);
  const summaries = useMemoryStore((s) => s.recentSummaries);
  const memories = useMemoryStore((s) => s.memories);
  const loadAll = useMemoryStore((s) => s.loadAll);
  const deleteProfile = useMemoryStore((s) => s.deleteProfile);
  const deleteEpisode = useMemoryStore((s) => s.deleteEpisode);
  const deleteMemory = useMemoryStore((s) => s.deleteMemory);

  const [profilesCollapsed, setProfilesCollapsed] = useState(false);
  const [episodesCollapsed, setEpisodesCollapsed] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const isEmpty = profiles.length === 0 && episodes.length === 0 && summaries.length === 0 && memories.length === 0;

  const handleEdit = useCallback((id: string) => {
    navigation.navigate('MemoryEdit', { memoryId: id });
  }, [navigation]);

  // ── Group profiles by category ──
  const profilesByCategory = profiles.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<ProfileCategory, CoreProfile[]>);

  const categoryOrder: ProfileCategory[] = ['identity', 'relationship', 'preference', 'trait'];
  const categoryLabels: Record<ProfileCategory, string> = {
    identity: t('memory.identity'),
    relationship: t('memory.relationship'),
    preference: t('memory.preference'),
    trait: t('memory.trait'),
  };
  const categoryIcons: Record<ProfileCategory, keyof typeof Feather.glyphMap> = {
    identity: 'user',
    relationship: 'heart',
    preference: 'star',
    trait: 'zap',
  };

  // ── Group episodes by date ──
  const episodeGroups = useMemo(() => {
    const groups: { label: string; items: EpisodicMemory[] }[] = [];
    const limited = episodes.slice(0, 20);
    let currentLabel = '';

    for (const ep of limited) {
      const label = getDateGroupLabel(ep.eventDate || ep.createdAt);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, items: [] });
      }
      groups[groups.length - 1].items.push(ep);
    }
    return groups;
  }, [episodes]);

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
              {/* ── Section 1: Core Profiles ── */}
              {profiles.length > 0 && (
                <CardContainer style={styles.section}>
                  <SectionHeader
                    title={t('memory.coreProfiles')}
                    collapsed={profilesCollapsed}
                    onToggle={() => setProfilesCollapsed(!profilesCollapsed)}
                  />
                  {!profilesCollapsed && categoryOrder.map((cat) => {
                    const items = profilesByCategory[cat];
                    if (!items || items.length === 0) return null;
                    return (
                      <View key={cat} style={styles.categoryGroup}>
                        <View style={styles.categoryHeader}>
                          <Feather name={categoryIcons[cat]} size={14} color={colors.textSecondary} />
                          <HollowText variant="caption" color={colors.textSecondary} style={styles.categoryLabel}>
                            {categoryLabels[cat]}
                          </HollowText>
                        </View>
                        {items.sort((a, b) => b.confidence - a.confidence).map((profile) => (
                          <ProfileRow
                            key={profile.id}
                            profile={profile}
                            onDelete={() => deleteProfile(profile.id)}
                          />
                        ))}
                      </View>
                    );
                  })}
                </CardContainer>
              )}

              {/* ── Section 2: Episodic Memories (date-grouped) ── */}
              {episodes.length > 0 && (
                <CardContainer style={styles.section}>
                  <SectionHeader
                    title={t('memory.recentMemories')}
                    collapsed={episodesCollapsed}
                    onToggle={() => setEpisodesCollapsed(!episodesCollapsed)}
                  />
                  {!episodesCollapsed && episodeGroups.map((group) => (
                    <View key={group.label} style={styles.dateGroup}>
                      <HollowText variant="caption" color={colors.textMuted} style={styles.dateLabel}>
                        {group.label}
                      </HollowText>
                      {group.items.map((ep) => (
                        <EpisodeRow
                          key={ep.id}
                          episode={ep}
                          onDelete={() => deleteEpisode(ep.id)}
                        />
                      ))}
                    </View>
                  ))}
                </CardContainer>
              )}

              {/* ── Section 3: Session Summaries ── */}
              {summaries.length > 0 && (
                <CardContainer style={styles.section}>
                  <HollowText variant="subheading" serif color={colors.amber} style={styles.sectionTitle}>
                    {t('memory.conversationSummaries')}
                  </HollowText>
                  {summaries.map((s, i) => (
                    <View key={s.id} style={styles.summaryRow}>
                      <View style={styles.summaryHeader}>
                        <Feather name="message-circle" size={14} color={colors.textSecondary} />
                        <HollowText variant="caption" color={colors.textSecondary}>
                          {i === 0 ? t('memory.lastChat') : i === 1 ? t('memory.previousChat') : t('memory.earlier')}
                        </HollowText>
                      </View>
                      <HollowText variant="body" color={colors.textPrimary} style={styles.summaryText}>
                        {s.summary}
                      </HollowText>
                      {s.keyTopics.length > 0 && (
                        <View style={styles.topicsRow}>
                          {s.keyTopics.map((topic, idx) => (
                            <View key={idx} style={styles.topicChip}>
                              <HollowText variant="caption" color={colors.textSecondary}>
                                {topic}
                              </HollowText>
                            </View>
                          ))}
                        </View>
                      )}
                      {i < summaries.length - 1 && <View style={styles.divider} />}
                    </View>
                  ))}
                </CardContainer>
              )}

              {/* ── Legacy memories (backward-compatible, shown only when no V2 data) ── */}
              {memories.length > 0 && profiles.length === 0 && (
                <CardContainer style={styles.section}>
                  <HollowText variant="subheading" serif color={colors.amber} style={styles.sectionTitle}>
                    {t('memory.title')}
                  </HollowText>
                  {memories.map((entry) => (
                    <View key={entry.id} style={styles.profileRow}>
                      <Feather
                        name={entry.category === 'people' ? 'user' : entry.category === 'events' ? 'calendar' : 'star'}
                        size={16}
                        color={colors.amber}
                        style={{ marginRight: spacing.md }}
                      />
                      <HollowText variant="body" style={{ flex: 1 }} numberOfLines={1}>
                        {entry.title}
                      </HollowText>
                      <TouchableOpacity onPress={() => handleEdit(entry.id)} style={styles.deleteBtn}>
                        <Feather name="edit-2" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteMemory(entry.id)} style={styles.deleteBtn}>
                        <Feather name="trash-2" size={14} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </CardContainer>
              )}
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

  // ── Section ──
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: 0,
  },

  // ── Profiles ──
  categoryGroup: {
    marginBottom: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  categoryLabel: {
    letterSpacing: 0.5,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    paddingLeft: spacing.xs,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.md,
    marginTop: 6,
  },
  profileContent: {
    flex: 1,
  },
  profileTitle: {
    marginBottom: 2,
  },
  removeLink: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },

  // ── Episodes ──
  dateGroup: {
    marginBottom: spacing.md,
  },
  dateLabel: {
    fontSize: 12,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  episodeRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  episodeCenter: {
    flex: 1,
  },
  episodeContent: {
    lineHeight: 20,
  },
  emotionTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  emotionText: {
    fontSize: 11,
  },

  // ── Summaries ──
  summaryRow: {
    marginBottom: spacing.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  summaryText: {
    lineHeight: 20,
    marginBottom: 6,
  },
  topicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  topicChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.md,
  },

  // ── Common ──
  deleteBtn: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});
