import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { colors } from '../../theme';
import { useBreathingAnimation } from '../../hooks/useBreathingAnimation';

interface Props {
  size?: number;
}

export function AmberGlowDot({ size = 60 }: Props) {
  const { animatedStyle } = useBreathingAnimation(3000);

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          animatedStyle,
          {
            width: size * 3,
            height: size * 3,
            borderRadius: size * 1.5,
            backgroundColor: 'rgba(212, 165, 116, 0.08)',
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <View
          style={{
            width: size * 1.8,
            height: size * 1.8,
            borderRadius: size * 0.9,
            backgroundColor: 'rgba(212, 165, 116, 0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.amber,
            }}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
