import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { HollowText } from '../common/HollowText';
import { colors, spacing, borderRadius } from '../../theme';
import { useI18n } from '../../i18n';

interface Props {
  onGoToSettings: () => void;
  onDismiss: () => void;
}

export function ApiKeyGuide({ onGoToSettings, onDismiss }: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <View style={styles.iconRow}>
        <Feather name="key" size={24} color={colors.amber} />
      </View>
      <HollowText variant="subheading" center style={styles.title}>
        {t('apiKeyGuide.title')}
      </HollowText>
      <HollowText variant="body" color={colors.textSecondary} center style={styles.subtitle}>
        {t('apiKeyGuide.subtitle')}
      </HollowText>
      <TouchableOpacity style={styles.primaryBtn} onPress={onGoToSettings} activeOpacity={0.8}>
        <Feather name="settings" size={16} color={colors.background} />
        <HollowText variant="body" color={colors.background} style={{ marginLeft: 8 }}>
          {t('apiKeyGuide.goToSettings')}
        </HollowText>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss} activeOpacity={0.7}>
        <HollowText variant="caption" color={colors.textMuted}>
          {t('apiKeyGuide.skipForNow')}
        </HollowText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    marginVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconRow: {
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.amber,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    width: '100%',
    marginBottom: spacing.sm,
  },
  secondaryBtn: {
    paddingVertical: spacing.sm,
  },
});
