import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { HollowText } from '../../components/common/HollowText';
import { AmberButton } from '../../components/common/AmberButton';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useMemoryStore } from '../../store/useMemoryStore';
import { useI18n } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, spacing, borderRadius } from '../../theme';
import * as profileRepo from '../../services/storage/profileRepo';
import * as episodeRepo from '../../services/storage/episodeRepo';
import {
  pickMarkdownFile,
  isHollowExportFormat,
  parseHollowExport,
  buildImportParsingPrompt,
  callAIForImport,
  parseAIImportResponse,
  type ImportResult,
} from '../../services/memory/memoryImporter';

type ImportStep = 'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error';

export function MemoryImportScreen() {
  const { t } = useI18n();
  const { isDesktop } = useResponsive();
  const navigation = useNavigation();

  const [step, setStep] = useState<ImportStep>('idle');
  const [importData, setImportData] = useState<ImportResult | null>(null);
  const [checkedProfiles, setCheckedProfiles] = useState<Set<string>>(new Set());
  const [checkedEpisodes, setCheckedEpisodes] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ profileCount: 0, episodeCount: 0 });

  const CATEGORY_LABELS: Record<string, string> = {
    identity: t('memory.identity'),
    relationship: t('memory.relationship'),
    preference: t('memory.preference'),
    trait: t('memory.trait'),
  };

  const EMOTION_LABELS: Record<string, string> = {
    happy: '开心', sad: '难过', anxious: '焦虑', angry: '生气',
    excited: '兴奋', calm: '平静', frustrated: '沮丧', hopeful: '期待', neutral: '平静',
  };

  const EMOTION_COLORS: Record<string, string> = {
    happy: '#D4A574', excited: '#D4A574',
    sad: '#6B8DB2', frustrated: '#6B8DB2',
    anxious: '#C45C5C', angry: '#C45C5C',
    calm: '#5C8A6E', hopeful: '#5C8A6E',
    neutral: colors.textMuted,
  };

  const handlePickFile = useCallback(async () => {
    setStep('parsing');
    setError('');

    const content = await pickMarkdownFile();
    if (!content) {
      setStep('idle');
      return;
    }

    if (isHollowExportFormat(content)) {
      // Deterministic parsing — no AI needed
      const result = parseHollowExport(content);
      if (result.profiles.length === 0 && result.episodes.length === 0) {
        setError(t('memory.importEmpty'));
        setStep('error');
        return;
      }
      setImportData(result);
      // Check all items by default
      setCheckedProfiles(new Set(result.profiles.map((p) => p.key)));
      setCheckedEpisodes(new Set(result.episodes.map((_, i) => i)));
      setStep('preview');
    } else {
      // AI parsing
      try {
        const prompt = buildImportParsingPrompt(content);
        const settings = useSettingsStore.getState();
        const response = await callAIForImport(prompt, settings);
        const result = parseAIImportResponse(response);

        if (result && (result.profiles.length > 0 || result.episodes.length > 0)) {
          setImportData(result);
          setCheckedProfiles(new Set(result.profiles.map((p) => p.key)));
          setCheckedEpisodes(new Set(result.episodes.map((_, i) => i)));
          setStep('preview');
        } else {
          setError(t('memory.importEmpty'));
          setStep('error');
        }
      } catch (e: any) {
        setError(e?.message || t('memory.importError'));
        setStep('error');
      }
    }
  }, [t]);

  const toggleProfile = (key: string) => {
    Haptics.selectionAsync();
    setCheckedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleEpisode = (idx: number) => {
    Haptics.selectionAsync();
    setCheckedEpisodes((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleConfirmImport = async () => {
    if (!importData) return;
    setStep('importing');

    let profileCount = 0;
    let episodeCount = 0;

    try {
      for (const p of importData.profiles) {
        if (checkedProfiles.has(p.key)) {
          await profileRepo.upsertProfile({
            key: p.key,
            category: p.category,
            title: p.title,
            content: p.content,
            confidence: 0.8, // User-imported: higher confidence
            mentionCount: 1,
          });
          profileCount++;
        }
      }

      for (let i = 0; i < importData.episodes.length; i++) {
        if (checkedEpisodes.has(i)) {
          const ep = importData.episodes[i];
          await episodeRepo.insertEpisode({
            sessionId: null,
            content: ep.content,
            emotion: ep.emotion,
            intensity: ep.intensity,
            eventDate: ep.eventDate === 'unknown' ? new Date().toISOString().split('T')[0] : ep.eventDate,
            decayWeight: 1.0,
          });
          episodeCount++;
        }
      }

      useMemoryStore.getState().invalidateCache();
      await useMemoryStore.getState().loadAll();

      setStats({ profileCount, episodeCount });
      setStep('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e?.message || t('memory.importError'));
      setStep('error');
    }
  };

  const selectedProfileCount = checkedProfiles.size;
  const selectedEpisodeCount = checkedEpisodes.size;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <HollowText variant="subheading" serif>
          {t('memory.importTitle')}
        </HollowText>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Idle: description + pick file button ── */}
        {step === 'idle' && (
          <View style={styles.centeredContent}>
            <Feather name="upload" size={48} color={colors.amber} style={styles.bigIcon} />
            <HollowText variant="body" color={colors.textSecondary} center style={styles.description}>
              {t('memory.importDesc')}
            </HollowText>
            <AmberButton
              title={t('memory.selectFile')}
              onPress={handlePickFile}
              variant="filled"
              style={styles.actionBtn}
            />
          </View>
        )}

        {/* ── Parsing: loading animation ── */}
        {step === 'parsing' && (
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={colors.amber} />
            <HollowText variant="body" color={colors.textSecondary} center style={styles.statusText}>
              {t('memory.importParsing')}
            </HollowText>
          </View>
        )}

        {/* ── Preview: show parsed results with checkboxes ── */}
        {step === 'preview' && importData && (
          <View>
            <HollowText variant="body" color={colors.textSecondary} style={styles.sectionHint}>
              {t('memory.importPreview')}
            </HollowText>

            {/* Profiles */}
            {importData.profiles.length > 0 && (
              <>
                <HollowText variant="subheading" serif style={styles.sectionTitle}>
                  {t('memory.coreProfiles')} ({selectedProfileCount})
                </HollowText>
                {importData.profiles.map((p) => (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.previewItem, checkedProfiles.has(p.key) && styles.previewItemChecked]}
                    onPress={() => toggleProfile(p.key)}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={checkedProfiles.has(p.key) ? 'check-square' : 'square'}
                      size={18}
                      color={checkedProfiles.has(p.key) ? colors.amber : colors.textMuted}
                      style={styles.checkbox}
                    />
                    <View style={styles.previewItemContent}>
                      <View style={styles.previewItemHeader}>
                        <HollowText variant="body" color={colors.textPrimary}>
                          {p.title}
                        </HollowText>
                        <HollowText variant="label" color={colors.textMuted}>
                          {CATEGORY_LABELS[p.category] || p.category}
                        </HollowText>
                      </View>
                      <HollowText variant="caption" color={colors.textSecondary} numberOfLines={2}>
                        {p.content}
                      </HollowText>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Episodes */}
            {importData.episodes.length > 0 && (
              <>
                <HollowText variant="subheading" serif style={styles.sectionTitle}>
                  {t('memory.recentMemories')} ({selectedEpisodeCount})
                </HollowText>
                {importData.episodes.map((ep, i) => (
                  <TouchableOpacity
                    key={`ep-${i}`}
                    style={[styles.previewItem, checkedEpisodes.has(i) && styles.previewItemChecked]}
                    onPress={() => toggleEpisode(i)}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={checkedEpisodes.has(i) ? 'check-square' : 'square'}
                      size={18}
                      color={checkedEpisodes.has(i) ? colors.amber : colors.textMuted}
                      style={styles.checkbox}
                    />
                    <View style={styles.previewItemContent}>
                      <HollowText variant="body" color={colors.textPrimary} numberOfLines={2}>
                        {ep.content}
                      </HollowText>
                      <View style={styles.tagRow}>
                        <View style={[styles.emotionTag, { backgroundColor: (EMOTION_COLORS[ep.emotion] || colors.textMuted) + '20' }]}>
                          <View style={[styles.emotionDot, { backgroundColor: EMOTION_COLORS[ep.emotion] || colors.textMuted }]} />
                          <HollowText variant="label" color={EMOTION_COLORS[ep.emotion] || colors.textMuted}>
                            {EMOTION_LABELS[ep.emotion] || ep.emotion}
                          </HollowText>
                        </View>
                        {ep.eventDate && ep.eventDate !== 'unknown' && (
                          <HollowText variant="label" color={colors.textMuted}>
                            {ep.eventDate}
                          </HollowText>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Confirm button */}
            <View style={styles.confirmSection}>
              <HollowText variant="caption" color={colors.textSecondary} center>
                {t('memory.importStats', {
                  profiles: String(selectedProfileCount),
                  episodes: String(selectedEpisodeCount),
                })}
              </HollowText>
              <AmberButton
                title={t('memory.importConfirm')}
                onPress={handleConfirmImport}
                variant="filled"
                style={styles.actionBtn}
                disabled={selectedProfileCount === 0 && selectedEpisodeCount === 0}
              />
            </View>
          </View>
        )}

        {/* ── Importing: progress ── */}
        {step === 'importing' && (
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color={colors.amber} />
            <HollowText variant="body" color={colors.textSecondary} center style={styles.statusText}>
              {t('memory.importing')}
            </HollowText>
          </View>
        )}

        {/* ── Done: success ── */}
        {step === 'done' && (
          <View style={styles.centeredContent}>
            <Feather name="check-circle" size={48} color={colors.success} style={styles.bigIcon} />
            <HollowText variant="subheading" serif center>
              {t('memory.importSuccess')}
            </HollowText>
            <HollowText variant="body" color={colors.textSecondary} center style={styles.statusText}>
              {t('memory.importStats', {
                profiles: String(stats.profileCount),
                episodes: String(stats.episodeCount),
              })}
            </HollowText>
            <AmberButton
              title={t('common.done')}
              onPress={() => navigation.goBack()}
              variant="outlined"
              style={styles.actionBtn}
            />
          </View>
        )}

        {/* ── Error ── */}
        {step === 'error' && (
          <View style={styles.centeredContent}>
            <Feather name="alert-circle" size={48} color={colors.danger} style={styles.bigIcon} />
            <HollowText variant="body" color={colors.danger} center style={styles.statusText}>
              {error}
            </HollowText>
            <AmberButton
              title={t('memory.retry')}
              onPress={() => { setStep('idle'); setError(''); }}
              variant="outlined"
              style={styles.actionBtn}
            />
          </View>
        )}
      </ScrollView>
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
  body: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  scrollDesktop: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: spacing.lg,
  },
  bigIcon: {
    marginBottom: spacing.md,
  },
  description: {
    maxWidth: 300,
    lineHeight: 22,
  },
  statusText: {
    marginTop: spacing.sm,
  },
  actionBtn: {
    marginTop: spacing.lg,
    minWidth: 200,
  },
  sectionHint: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewItemChecked: {
    borderColor: colors.amberDark,
    backgroundColor: colors.amberMuted,
  },
  checkbox: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  previewItemContent: {
    flex: 1,
    gap: 4,
  },
  previewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  emotionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  emotionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confirmSection: {
    marginTop: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing['2xl'],
  },
});
