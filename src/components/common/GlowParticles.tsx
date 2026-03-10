import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../../theme';

const PARTICLE_COUNT = 22;

interface ParticleProps {
  x: number;
  y: number;
  size: number;
  initialOpacity: number;
  duration: number;
  delay: number;
}

function Particle({ x, y, size, initialOpacity, duration, delay }: ParticleProps) {
  const opacity = useSharedValue(initialOpacity);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(initialOpacity > 0.3 ? 0.1 : 0.5, {
          duration,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: `${x}%`,
          top: `${y}%`,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    />
  );
}

export function GlowParticles() {
  const particles = useMemo<ParticleProps[]>(() => {
    const result: ParticleProps[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      result.push({
        x: Math.random() * 90 + 5,
        y: Math.random() * 90 + 5,
        size: 2 + Math.random() * 2,
        initialOpacity: 0.1 + Math.random() * 0.4,
        duration: 2000 + Math.random() * 2000,
        delay: Math.random() * 2000,
      });
    }
    return result;
  }, []);

  return (
    <>
      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    backgroundColor: colors.amber,
  },
});
