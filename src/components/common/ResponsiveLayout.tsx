import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { colors } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';

interface Props {
  children: React.ReactNode;
}

export function ResponsiveLayout({ children }: Props) {
  const { isMobile, isDesktop, contentMaxWidth } = useResponsive();

  if (isMobile || Platform.OS !== 'web') {
    return <View style={styles.mobileRoot}>{children}</View>;
  }

  return (
    <View style={styles.desktopRoot}>
      <View style={[styles.desktopContainer, { maxWidth: contentMaxWidth }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  desktopRoot: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background,
    overflow: 'hidden',
    // Web shadow for elevation
    ...(Platform.OS === 'web'
      ? {
          // @ts-ignore - web-only properties
          boxShadow: '0 0 60px rgba(212, 165, 116, 0.06)',
        }
      : {}),
  },
});
