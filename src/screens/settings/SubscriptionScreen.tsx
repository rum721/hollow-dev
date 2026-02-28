import React from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { HollowText } from '../../components/common/HollowText';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useI18n } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { TIER_CONFIG, TIER_LABELS } from '../../types/subscription';
import type { SubscriptionTier } from '../../types/subscription';

const TIERS: SubscriptionTier[] = ['free', 'lite', 'vip', 'premium'];

const TIER_PRICES: Record<SubscriptionTier, string> = {
  free: '$0',
  lite: '$0.99/mo',
  vip: '$9.99/mo',
  premium: '$99.99/mo',
};

function getTierFeatureKeys(tier: SubscriptionTier): string[] {
  switch (tier) {
    case 'free':
      return [
        'subscription.features.basicModel',
        'subscription.features.dataTraining',
      ];
    case 'lite':
      return [
        'subscription.features.basicModel',
        'subscription.features.dataTraining',
      ];
    case 'vip':
      return [
        'subscription.features.byok',
        'subscription.features.dataYours',
      ];
    case 'premium':
      return [
        'subscription.features.bestModels',
        'subscription.features.dataYours',
        'subscription.features.priority',
      ];
  }
}

export function SubscriptionScreen() {
  const { t, locale } = useI18n();
  const { isDesktop } = useResponsive();
  const navigation = useNavigation();
  const currentTier = useSubscriptionStore((s) => s.tier);
  const setTier = useSubscriptionStore((s) => s.setTier);

  const handleSelectTier = (tier: SubscriptionTier) => {
    if (tier === currentTier) return;
    if (__DEV__) {
      setTier(tier);
      useSubscriptionStore.setState({ todayUsage: 0 });
    }
    // In production, this would navigate to a payment flow
  };

  const tierLabel = (tier: SubscriptionTier) =>
    locale === 'zh' ? TIER_LABELS[tier].zh : TIER_LABELS[tier].en;

  const dailyLimitText = (tier: SubscriptionTier) => {
    const limit = TIER_CONFIG[tier].dailyLimit;
    if (limit === Infinity) {
      return t('subscription.unlimited');
    }
    return t('subscription.messagesPerDay', { count: String(limit) });
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
          {/* Header with back button */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <HollowText variant="heading" style={styles.title}>
              {t('subscription.title')}
            </HollowText>
          </View>

          {/* Current plan badge */}
          <View style={styles.currentPlanBadge}>
            <Feather name="check-circle" size={16} color={colors.amber} />
            <HollowText variant="caption" color={colors.amber} style={styles.currentPlanText}>
              {t('subscription.currentPlanBadge')}: {tierLabel(currentTier)}
            </HollowText>
          </View>

          {/* Tier cards */}
          {TIERS.map((tier) => {
            const isCurrent = tier === currentTier;
            const features = getTierFeatureKeys(tier);

            return (
              <View
                key={tier}
                style={[
                  styles.card,
                  isCurrent && styles.cardCurrent,
                ]}
              >
                {/* Card header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <HollowText
                      variant="subheading"
                      serif
                      color={isCurrent ? colors.amber : colors.textPrimary}
                    >
                      {tierLabel(tier)}
                    </HollowText>
                    {isCurrent && (
                      <View style={styles.currentTag}>
                        <HollowText variant="label" color={colors.background}>
                          {t('subscription.current')}
                        </HollowText>
                      </View>
                    )}
                  </View>
                  <HollowText
                    variant="heading"
                    color={isCurrent ? colors.amber : colors.amberLight}
                    style={styles.price}
                  >
                    {TIER_PRICES[tier]}
                  </HollowText>
                </View>

                {/* Daily limit */}
                <View style={styles.limitRow}>
                  <Feather
                    name="message-circle"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <HollowText variant="body" color={colors.textSecondary}>
                    {dailyLimitText(tier)}
                  </HollowText>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Feature list */}
                <View style={styles.featureList}>
                  {features.map((featureKey) => (
                    <View key={featureKey} style={styles.featureRow}>
                      <Feather name="check" size={14} color={colors.success} />
                      <HollowText variant="caption" color={colors.textSecondary} style={styles.featureText}>
                        {t(featureKey)}
                      </HollowText>
                    </View>
                  ))}
                </View>

                {/* Action button */}
                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    isCurrent ? styles.selectButtonCurrent : styles.selectButtonUpgrade,
                  ]}
                  onPress={() => handleSelectTier(tier)}
                  activeOpacity={isCurrent ? 1 : 0.7}
                  disabled={isCurrent}
                >
                  <HollowText
                    variant="body"
                    color={isCurrent ? colors.textMuted : colors.background}
                  >
                    {isCurrent ? t('subscription.current') : t('subscription.select')}
                  </HollowText>
                </TouchableOpacity>
              </View>
            );
          })}
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
    maxWidth: 600,
    alignSelf: 'center',
    paddingTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  title: {
    flex: 1,
  },
  currentPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.amberMuted,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.xl,
  },
  currentPlanText: {
    marginLeft: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardCurrent: {
    borderColor: colors.amber,
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  currentTag: {
    backgroundColor: colors.amber,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  price: {
    marginLeft: spacing.sm,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  featureList: {
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  featureText: {
    flex: 1,
  },
  selectButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  selectButtonUpgrade: {
    backgroundColor: colors.amber,
  },
  selectButtonCurrent: {
    backgroundColor: colors.surfaceLight,
  },
});
