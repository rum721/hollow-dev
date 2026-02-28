import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { HollowText } from '../common/HollowText';
import { useI18n } from '../../i18n';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { colors, spacing, borderRadius } from '../../theme';

interface Props {
  onUpgrade?: () => void;
  onDismiss?: () => void;
}

export function UpgradePrompt({ onUpgrade, onDismiss }: Props) {
  const { t } = useI18n();
  const tier = useSubscriptionStore((s) => s.tier);

  const message = tier === 'free'
    ? t('upgrade.freeLimit')
    : t('upgrade.liteLimit');

  const targetTier = tier === 'free' ? 'Lite' : 'VIP';

  return (
    <View style={styles.container}>
      <HollowText variant="caption" color={colors.textSecondary} style={styles.message}>
        {message}
      </HollowText>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade} activeOpacity={0.7}>
          <HollowText variant="caption" color={colors.background}>
            {t('upgrade.upgradeToTier', { tier: targetTier })}
          </HollowText>
        </TouchableOpacity>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} activeOpacity={0.7}>
            <HollowText variant="caption" color={colors.textMuted}>
              {t('upgrade.dismiss')}
            </HollowText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  message: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  upgradeButton: {
    backgroundColor: colors.amber,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
});
