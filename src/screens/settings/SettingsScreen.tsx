import React, { useState } from 'react';
import { StyleSheet, ScrollView, Alert, View, TextInput, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { HollowText } from '../../components/common/HollowText';
import { SettingsGroup } from '../../components/settings/SettingsGroup';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useI18n } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { MODEL_LIST, getModelInfo } from '../../services/ai/models';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import type { LanguageSetting, ConversationStyle, ModelInfo } from '../../types/settings';

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

export function SettingsScreen() {
  const { t } = useI18n();
  const store = useSettingsStore();
  const { isDesktop } = useResponsive();
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showApiInput, setShowApiInput] = useState(false);

  const currentModel = getModelInfo(store.selectedModel);
  const langLabel = LANGUAGES.find((l) => l.key === store.language);
  const styleLabel = STYLES.find((s) => s.key === store.conversationStyle);

  const cycleLang = () => {
    const idx = LANGUAGES.findIndex((l) => l.key === store.language);
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
    store.setLanguage(next.key);
  };

  const cycleStyle = () => {
    const idx = STYLES.findIndex((s) => s.key === store.conversationStyle);
    const next = STYLES[(idx + 1) % STYLES.length];
    store.setConversationStyle(next.key);
  };

  const handleErase = () => {
    Alert.alert(t('common.warning'), t('settings.eraseConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), style: 'destructive', onPress: () => {} },
    ]);
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
            <SettingsRow icon="clock" label={t('settings.autoDestruct')} showArrow />
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
                <TextInput
                  style={styles.apiInput}
                  value={currentApiKey}
                  onChangeText={(val) => store.setApiKey(currentModel.apiKeyField, val)}
                  placeholder={t('settings.apiKeyPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.amber}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}
            <View style={styles.sliderRow}>
              <HollowText variant="caption">{t('settings.concise')}</HollowText>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${store.responseStyleValue}%` }]} />
              </View>
              <HollowText variant="caption">{t('settings.elaborate')}</HollowText>
            </View>
          </SettingsGroup>

          {/* Subscription */}
          <SettingsGroup title={t('settings.subscription')}>
            <SettingsRow icon="credit-card" label={t('settings.currentPlan')} value={t('settings.premiumMonthly')} />
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
  apiInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    backgroundColor: colors.surface,
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
    overflow: 'hidden',
  },
  sliderFill: {
    height: 4,
    backgroundColor: colors.amber,
    borderRadius: 2,
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
});
