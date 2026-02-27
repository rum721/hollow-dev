import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { HollowText } from '../common/HollowText';
import { colors, spacing, borderRadius } from '../../theme';
import { useI18n } from '../../i18n';

interface Props {
  onPress: () => void;
}

export function AddMemoryButton({ onPress }: Props) {
  const { t } = useI18n();

  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
      <Feather name="plus" size={18} color={colors.background} />
      <HollowText variant="body" serif color={colors.background} style={styles.text}>
        {t('memory.addMemory')}
      </HollowText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.amber,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    alignSelf: 'center',
  },
  text: {
    fontSize: 16,
  },
});
