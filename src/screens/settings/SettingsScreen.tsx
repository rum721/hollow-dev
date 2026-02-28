import React, { useState, useRef } from 'react';
import { StyleSheet, ScrollView, Alert, View, TextInput, TouchableOpacity, Modal, FlatList, Platform, ActivityIndicator, PanResponder } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { HollowText } from '../../components/common/HollowText';
import { SettingsGroup } from '../../components/settings/SettingsGroup';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useI18n } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { MODEL_LIST, getModelInfo } from '../../services/ai/models';
import { validateApiKey } from '../../services/ai/aiRouter';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { TIER_LABELS, TIER_CONFIG } from '../../types/subscription';
import type { SubscriptionTier } from '../../types/subscription';
import type { LanguageSetting, ConversationStyle, ModelInfo, AutoDestructDays } from '../../types/settings';
import type { SettingsStackParamList } from '../../types/navigation';

const TIERS: SubscriptionTier[] = ['free', 'lite', 'vip', 'premium'];

const LANGUAGES: { key: LanguageSetting; labelKey: string }[] = [
  { key: 'auto', labelKey: 'settings.languageAuto' },
  { key: 'en', labelKey: 'settings.languageEn' },
  { key: 'zh', labelKey: 'settings.languageZh' },
];

const STYLES: { key: ConversationStyle; labelKey: string }[] = [
  { key: 'empathetic', labelKey: 'onboarding.style.empathetic' },
  { key: 'analytical', labelKey: 'onboarding.style.analytical' },
  { key: 'balanced', labelKey: 'onboarding.style.balanced' },
];

const AUTO_DESTRUCT_OPTIONS: AutoDestructDays[] = [null, 7, 30, 90];

export function SettingsScreen() {
  const { t } = useI18n();
  const store = useSettingsStore();
  const { isDesktop } = useResponsive();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const tier = useSubscriptionStore((s) => s.tier);
  const setTier = useSubscriptionStore((s) => s.setTier);
  const todayUsage = useSubscriptionStore((s) => s.todayUsage);
  const getRemainingMessages = useSubscriptionStore((s) => s.getRemainingMessages);
  const remaining = getRemainingMessages();
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showApiInput, setShowApiInput] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);

  const sliderTrackRef = useRef<View>(null);
  const [trackLayout, setTrackLayout] = useState({ x: 0, width: 0 });

  const handleSliderTouch = (pageX: number) => {
    if (trackLayout.width === 0) return;
    const ratio = Math.max(0, Math.min(1, (pageX - trackLayout.x) / trackLayout.width));
    const value = Math.round(ratio * 100 / 10) * 10; // snap to 10s
    store.setResponseStyleValue(value);
  };

  const sliderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => handleSliderTouch(evt.nativeEvent.pageX),
      onPanResponderMove: (evt) => handleSliderTouch(evt.nativeEvent.pageX),
    })
  ).current;

  const currentModel = getModelInfo(store.selectedModel);
  const langLabel = LANGUAGES.find((l) => l.key === store.language);
  const styleLabel = STYLES.find((s) => s.key === store.conversationStyle);

  const cycleLang = () => {
    Haptics.selectionAsync();
    const idx = LANGUAGES.findIndex((l) => l.key === store.language);
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
    store.setLanguage(next.key);
  };

  const cycleStyle = () => {
    Haptics.selectionAsync();
    const idx = STYLES.findIndex((s) => s.key === store.conversationStyle);
    const next = STYLES[(idx + 1) % STYLES.length];
    store.setConversationStyle(next.key);
  };

  const autoDestructLabel = store.autoDestructDays === null
    ? t('settings.autoDestructNever')
    : t('settings.autoDestructDays', { days: String(store.autoDestructDays) });

  const cycleAutoDestruct = () => {
    const idx = AUTO_DESTRUCT_OPTIONS.indexOf(store.autoDestructDays);
    const next = AUTO_DESTRUCT_OPTIONS[(idx + 1) % AUTO_DESTRUCT_OPTIONS.length];
    store.setAutoDestructDays(next);
  };

  const cycleTier = () => {
    Haptics.selectionAsync();
    const idx = TIERS.indexOf(tier);
    const next = TIERS[(idx + 1) % TIERS.length];
    setTier(next);
    // Reset today's usage so user can test immediately after switching
    useSubscriptionStore.setState({ todayUsage: 0 });
  };

  const handleErase = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('settings.eraseConfirm'))) { /* TODO */ }
    } else {
      Alert.alert(t('common.warning'), t('settings.eraseConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), style: 'destructive', onPress: () => {} },
      ]);
    }
  };

  const handleValidateKey = async () => {
    if (!currentModel || !currentApiKey) return;
    setValidating(true);
    setValidationResult(null);
    const result = await validateApiKey(store.selectedModel, currentApiKey);
    setValidationResult(result);
    setValidating(false);
  };

  const currentApiKey = currentModel ? (store.apiKeys[currentModel.apiKeyField] ?? '') : '';

  const handleSelectModel = (model: ModelInfo) => {
    store.setSelectedModel(model.id);
    setShowModelPicker(false);
  };

  const renderModelItem = ({ item }: { item: ModelInfo }) => (
    <TouchableOpacity
      style={[styles.modelItem, item.id === store.selectedModel && styles.modelItemActive]}
      onPress={() => handleSelectModel(item)}
      activeOpacity={0.7}
    >
      <HollowText
        variant="body"
        color={item.id === store.selectedModel ? colors.amber : colors.textPrimary}
      >
        {item.label}
      </HollowText>
      <HollowText variant="label" color={colors.textMuted}>
        {item.provider}
      </HollowText>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
          <HollowText variant="heading" style={[styles.title, isDesktop && styles.titleDesktop]}>
            {t('settings.title')}
          </HollowText>

          {/* Profile */}
          <SettingsGroup title={t('settings.profile')}>
            <SettingsRow icon="user" label={t('settings.nickname')} value={store.nickname || '—'} />
            <SettingsRow
              icon="message-circle"
              label={t('settings.conversationStyle')}
              value={styleLabel ? t(styleLabel.labelKey) : ''}
              onPress={cycleStyle}
            />
            <SettingsRow
              icon="globe"
              label={t('settings.language')}
              value={langLabel ? t(langLabel.labelKey) : ''}
              onPress={cycleLang}
            />
          </SettingsGroup>

          {/* Privacy & Security */}
          <SettingsGroup title={t('settings.privacy')} highlighted titleColor={colors.amber}>
            <SettingsRow icon="shield" label={t('settings.e2ee')} value={t('settings.e2eeActive')} valueColor={colors.success} />
            <SettingsRow icon="hard-drive" label={t('settings.localStorage')} showArrow />
            <SettingsRow
              icon="lock"
              label={t('settings.biometricLock')}
              switchValue={store.biometricEnabled}
              onSwitchChange={store.setBiometricEnabled}
            />
            <SettingsRow
              icon="clock"
              label={t('settings.autoDestruct')}
              value={autoDestructLabel}
              onPress={cycleAutoDestruct}
            />
            <SettingsRow icon="alert-triangle" label={t('settings.eraseAll')} danger onPress={handleErase} />
          </SettingsGroup>

          {/* AI Settings */}
          <SettingsGroup title={t('settings.aiSettings')}>
            <SettingsRow
              icon="cpu"
              label={t('settings.modelSelection')}
              value={currentModel?.label ?? store.selectedModel}
              onPress={() => setShowModelPicker(true)}
            />
            <SettingsRow
              icon="key"
              label={t('settings.apiKey')}
              value={currentApiKey ? '••••••' : '—'}
              onPress={() => setShowApiInput(!showApiInput)}
            />
            {showApiInput && currentModel && (
              <View style={styles.apiInputRow}>
                <HollowText variant="label" color={colors.textMuted} style={styles.apiLabel}>
                  {currentModel.label} API Key
                </HollowText>
                <View style={styles.apiInputGroup}>
                  <TextInput
                    style={[styles.apiInput, { flex: 1 }]}
                    value={currentApiKey}
                    onChangeText={(val) => {
                      store.setApiKey(currentModel.apiKeyField, val);
                      setValidationResult(null);
                    }}
                    placeholder={t('settings.apiKeyPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    selectionColor={colors.amber}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={[styles.validateBtn, !currentApiKey && styles.validateBtnDisabled]}
                    onPress={handleValidateKey}
                    disabled={!currentApiKey || validating}
                    activeOpacity={0.7}
                  >
                    {validating ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <HollowText variant="caption" color={colors.background}>
                        {t('settings.validate')}
                      </HollowText>
                    )}
                  </TouchableOpacity>
                </View>
                {validationResult && (
                  <HollowText
                    variant="label"
                    color={validationResult.valid ? colors.success : colors.danger}
                    style={styles.validationResult}
                  >
                    {validationResult.valid ? t('settings.keyValid') : (validationResult.error ?? t('settings.keyInvalid'))}
                  </HollowText>
                )}
              </View>
            )}
            <View style={styles.sliderRow}>
              <HollowText variant="caption">{t('settings.concise')}</HollowText>
              <View
                ref={sliderTrackRef}
                style={styles.sliderTrack}
                onLayout={() => {
                  sliderTrackRef.current?.measureInWindow((x, _y, w) => {
                    setTrackLayout({ x, width: w });
                  });
                }}
                {...sliderPanResponder.panHandlers}
              >
                <View style={[styles.sliderFill, { width: `${store.responseStyleValue}%` }]} />
                <View style={[styles.sliderThumb, { left: `${store.responseStyleValue}%` }]} />
              </View>
              <HollowText variant="caption">{t('settings.elaborate')}</HollowText>
            </View>
          </SettingsGroup>

          {/* Premium Routing Hint */}
          {tier === 'premium' && (
            <View style={styles.premiumHint}>
              <Feather name="zap" size={14} color={colors.amber} />
              <HollowText variant="label" color={colors.textSecondary} style={{ flex: 1, marginLeft: 8 }}>
                {t('settings.premiumRoutingHint')}
              </HollowText>
            </View>
          )}

          {/* Subscription */}
          <SettingsGroup title={t('settings.subscription')}>
            <SettingsRow
              icon="credit-card"
              label={t('settings.currentPlan')}
              value={TIER_LABELS[tier]?.en ?? 'Free'}
              onPress={() => navigation.navigate('Subscription')}
            />
            <SettingsRow
              icon="bar-chart-2"
              label={t('settings.dailyUsage') ?? 'Daily Usage'}
              value={TIER_CONFIG[tier].dailyLimit === Infinity
                ? `${todayUsage} / ∞`
                : `${todayUsage} / ${TIER_CONFIG[tier].dailyLimit}`}
            />
            <SettingsRow
              icon="zap"
              label={t('settings.remaining') ?? 'Remaining'}
              value={remaining === Infinity ? '∞' : String(remaining)}
              valueColor={remaining <= 0 ? colors.danger : remaining <= 3 ? colors.amber : colors.success}
            />
          </SettingsGroup>

          {/* About */}
          <SettingsGroup title={t('settings.about') ?? 'About'}>
            <SettingsRow
              icon="file-text"
              label={t('settings.privacyPolicy') ?? 'Privacy Policy'}
              showArrow
              onPress={() => navigation.navigate('PrivacyPolicy')}
            />
            <SettingsRow
              icon="book-open"
              label={t('settings.termsOfService') ?? 'Terms of Service'}
              showArrow
              onPress={() => navigation.navigate('TermsOfService')}
            />
            <SettingsRow
              icon="info"
              label={t('settings.version') ?? 'Version'}
              value="1.0.0"
            />
          </SettingsGroup>
        </View>
      </ScrollView>

      {/* Model Picker Modal */}
      <Modal
        visible={showModelPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModelPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <HollowText variant="subheading" serif>
                {t('settings.modelSelection')}
              </HollowText>
              <TouchableOpacity onPress={() => setShowModelPicker(false)}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={MODEL_LIST}
              keyExtractor={(item) => item.id}
              renderItem={renderModelItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modelList}
            />
          </View>
        </View>
      </Modal>
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
    maxWidth: 600,
    alignSelf: 'center',
    paddingTop: spacing.xl,
  },
  title: {
    marginBottom: spacing.xl,
  },
  titleDesktop: {
    marginBottom: spacing['2xl'],
  },
  apiInputRow: {
    paddingVertical: spacing.sm,
  },
  apiLabel: {
    marginBottom: spacing.xs,
  },
  apiInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  apiInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    backgroundColor: colors.surface,
  },
  validateBtn: {
    backgroundColor: colors.amber,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    minWidth: 70,
    alignItems: 'center',
  },
  validateBtnDisabled: {
    opacity: 0.4,
  },
  validationResult: {
    marginTop: spacing.xs,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
  },
  sliderFill: {
    height: 4,
    backgroundColor: colors.amber,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.amber,
    top: -7,
    marginLeft: -9,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    paddingBottom: spacing['3xl'],
  },
  modalContentDesktop: {
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
    borderRadius: borderRadius.xl,
    marginBottom: spacing['3xl'],
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modelList: {
    padding: spacing.md,
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    marginBottom: 2,
  },
  modelItemActive: {
    backgroundColor: colors.amberMuted,
  },
  premiumHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 165, 116, 0.08)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.amber,
  },
});
