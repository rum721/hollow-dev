import React from 'react';
import { View, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { HollowText } from '../common/HollowText';
import { colors, spacing } from '../../theme';

interface Props {
  icon?: string;
  label: string;
  value?: string;
  valueColor?: string;
  showArrow?: boolean;
  onPress?: () => void;
  switchValue?: boolean;
  onSwitchChange?: (val: boolean) => void;
  danger?: boolean;
}

export function SettingsRow({
  icon,
  label,
  value,
  valueColor,
  showArrow,
  onPress,
  switchValue,
  onSwitchChange,
  danger,
}: Props) {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {icon && (
        <Feather
          name={icon as any}
          size={18}
          color={danger ? colors.danger : colors.amber}
          style={styles.icon}
        />
      )}
      <HollowText
        variant="body"
        color={danger ? colors.danger : colors.textPrimary}
        style={styles.label}
      >
        {label}
      </HollowText>
      {value && (
        <HollowText variant="caption" color={valueColor ?? colors.textSecondary}>
          {value}
        </HollowText>
      )}
      {onSwitchChange !== undefined && (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: colors.surfaceLight, true: colors.amberDark }}
          thumbColor={switchValue ? colors.amber : colors.textSecondary}
        />
      )}
      {showArrow && <Feather name="chevron-right" size={18} color={colors.textMuted} />}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  icon: {
    marginRight: spacing.md,
  },
  label: {
    flex: 1,
  },
});
