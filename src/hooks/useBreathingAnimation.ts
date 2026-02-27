import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export function useBreathingAnimation(duration = 3000) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 0.8 + progress.value * 0.4;
    const opacity = 0.4 + progress.value * 0.6;
    return { transform: [{ scale }], opacity };
  });

  return { animatedStyle, progress };
}
