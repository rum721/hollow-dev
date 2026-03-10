import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';
import { HollowText } from '../common/HollowText';

interface Props {
  title: string;
  onBack: () => void;
  onVoiceMode: () => void;
}

export function ChatHeader({ title, onBack, onVoiceMode }: Props) {
  const insets = useSafeAreaInsets();

  const content = (
    <>
      <TouchableOpacity onPress={onBack} style={styles.iconBtn} hitSlop={8}>
        <Feather name="arrow-left" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      <HollowText variant="body" serif style={styles.title}>
        {title}
      </HollowText>
      <TouchableOpacity onPress={onVoiceMode} style={styles.iconBtn} hitSlop={8}>
        <Feather name="mic" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </>
  );

  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={40} tint="dark" style={[styles.container, { paddingTop: insets.top + spacing.xs }]}>
        {content}
      </BlurView>
    );
  }

  return (
    <View style={[styles.container, styles.containerFallback, { paddingTop: insets.top + spacing.xs }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  containerFallback: {
    backgroundColor: colors.background,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 16,
  },
});
