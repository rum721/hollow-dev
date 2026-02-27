import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_COUNT = 40;
const BAR_WIDTH = (SCREEN_WIDTH - 80) / BAR_COUNT;

interface Props {
  isActive: boolean;
  meteringValue?: number;
}

function WaveBar({ index, isActive }: { index: number; isActive: boolean }) {
  const height = useSharedValue(4);

  useEffect(() => {
    if (isActive) {
      const baseHeight = 20 + Math.sin(index * 0.5) * 15;
      const maxHeight = 40 + Math.random() * 60;
      height.value = withRepeat(
        withDelay(
          index * 30,
          withTiming(maxHeight, {
            duration: 600 + Math.random() * 400,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      );
    } else {
      height.value = withTiming(4 + Math.sin(index * 0.3) * 3, { duration: 500 });
    }
  }, [isActive, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        animatedStyle,
        { width: BAR_WIDTH * 0.6 },
      ]}
    />
  );
}

export function WaveformVisualizer({ isActive }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <WaveBar key={i} index={i} isActive={isActive} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    gap: BAR_WIDTH * 0.4,
  },
  bar: {
    backgroundColor: colors.amber,
    borderRadius: 2,
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
});
