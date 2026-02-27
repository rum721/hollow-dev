import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';

interface Props {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  noPadding?: boolean;
}

export function ScreenContainer({ children, edges = ['top'], noPadding }: Props) {
  const { isDesktop } = useResponsive();

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={[styles.container, noPadding && styles.noPadding, isDesktop && styles.containerDesktop]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  noPadding: {
    paddingHorizontal: 0,
  },
  containerDesktop: {
    paddingHorizontal: spacing['2xl'],
  },
});
