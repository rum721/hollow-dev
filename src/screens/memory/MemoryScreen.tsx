import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { HollowText } from '../../components/common/HollowText';
import { CardContainer } from '../../components/common/CardContainer';
import { AddMemoryButton } from '../../components/memory/AddMemoryButton';
import { useMemoryStore } from '../../store/useMemoryStore';
import { useI18n } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, spacing } from '../../theme';
import { EMOTION_LABELS } from '../../services/ai/synonymDict';
import type { MemoryStackParamList } from '../../types/navigation';
import type { CoreProfile, ProfileCategory } from '../../types/memory';

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

// ── Time label helper ──
function getTimeLabel(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days <= 7) return `${days}天前`;
  if (days <= 30) return `${Math.floor(days / 7)}周前`;
  return `${Math.floor(days / 30)}个月前`;
}

// ── Confidence indicator ──
function ConfidenceDot({ confidence }: { confidence: number }) {
  const opacity = Math.max(0.3, Math.min(1, confidence));
  return (
    <View style={[styles.confidenceDot, { opacity, backgroundColor: colors.amber }]} />
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
                  <HollowText variant="subheading" serif color={colors.amber} style={styles.sectionTitle}>
                    {t('memory.coreProfiles')}
                  </HollowText>
                  {categoryOrder.map((cat) => {
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
                          <View key={profile.id} style={styles.profileRow}>
                            <ConfidenceDot confidence={profile.confidence} />
                            <View style={styles.profileContent}>
                              <HollowText variant="body" numberOfLines={1} style={styles.profileTitle}>
                                {profile.title}
                              </HollowText>
                              <HollowText variant="caption" color={colors.textSecondary} numberOfLines={2}>
                                {profile.content}
                              </HollowText>
                            </View>
                            <TouchableOpacity
                              onPress={() => deleteProfile(profile.id)}
                              style={styles.deleteBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Feather name="x" size={14} color={colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </CardContainer>
              )}

              {/* ── Section 2: Episodic Memories ── */}
              {episodes.length > 0 && (
                <CardContainer style={styles.section}>
                  <HollowText variant="subheading" serif color={colors.amber} style={styles.sectionTitle}>
                    {t('memory.recentMemories')}
                  </HollowText>
                  {episodes.slice(0, 20).map((ep) => (
                    <View key={ep.id} style={[styles.episodeRow, { opacity: Math.max(0.4, ep.decayWeight) }]}>
                      <View style={styles.episodeLeft}>
                        <HollowText variant="caption" color={colors.textMuted} style={styles.episodeTime}>
                          {getTimeLabel(ep.eventDate || ep.createdAt)}
                        </HollowText>
                      </View>
                      <View style={styles.episodeCenter}>
                        <HollowText variant="body" color={colors.textPrimary} style={styles.episodeContent}>
                          {ep.content}
                        </HollowText>
                        {ep.emotion !== 'neutral' && (
                          <View style={[styles.emotionTag, { backgroundColor: `${EMOTION_COLORS[ep.emotion] || colors.textSecondary}20` }]}>
                            <HollowText
                              variant="caption"
                              color={EMOTION_COLORS[ep.emotion] || colors.textSecondary}
                              style={styles.emotionText}
                            >
                              {EMOTION_LABELS[ep.emotion] || ep.emotion}
                            </HollowText>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => deleteEpisode(ep.id)}
                        style={styles.deleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="x" size={14} color={colors.textMuted} />
                      </TouchableOpacity>
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
  sectionTitle: {
    marginBottom: spacing.md,
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
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingLeft: spacing.xs,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.md,
  },
  profileContent: {
    flex: 1,
  },
  profileTitle: {
    marginBottom: 2,
  },

  // ── Episodes ──
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  episodeLeft: {
    width: 56,
    paddingTop: 2,
  },
  episodeTime: {
    fontSize: 11,
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
