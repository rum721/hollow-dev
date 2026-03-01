import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { colors } from '../../theme';
import { useBreathingAnimation } from '../../hooks/useBreathingAnimation';

interface Props {
  size?: number;
}

export function AmberGlowDot({ size = 60 }: Props) {
  const { animatedStyle } = useBreathingAnimation(3000);

  // 总画布尺寸 = 内核的 4 倍，给光晕足够的扩散空间
  const canvasSize = size * 4;
  const center = canvasSize / 2;

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          animatedStyle,
          {
            width: canvasSize,
            height: canvasSize,
          },
        ]}
      >
        <Svg
          width={canvasSize}
          height={canvasSize}
          viewBox={`0 0 ${canvasSize} ${canvasSize}`}
        >
          <Defs>
            {/*
              径向渐变：从中心到边缘的连续过渡
              使用多个 stop 确保平滑，模拟高斯光晕衰减

              色值基于 colors.amber (#D4A574 = RGB 212, 165, 116)
              从中心到边缘的 opacity 曲线遵循近似高斯分布:
              r=0%   → 1.0   (实色核心)
              r=10%  → 0.97  (核心边缘，仍然很亮)
              r=15%  → 0.85  (开始衰减)
              r=20%  → 0.65  (加速衰减)
              r=28%  → 0.42  (中间过渡带)
              r=36%  → 0.25  (过渡带尾部)
              r=48%  → 0.13  (外层光晕)
              r=60%  → 0.07  (微弱光晕)
              r=75%  → 0.03  (几乎消失)
              r=90%  → 0.01  (边缘残余)
              r=100% → 0.0   (完全透明)
            */}
            <RadialGradient
              id="amberGlow"
              cx="50%"
              cy="50%"
              rx="50%"
              ry="50%"
            >
              {/* 实色核心 */}
              <Stop offset="0%" stopColor={colors.amber} stopOpacity={1.0} />
              <Stop offset="10%" stopColor={colors.amber} stopOpacity={0.97} />

              {/* 核心到光晕的过渡带 — 这是关键，多个 stop 消除断裂 */}
              <Stop offset="15%" stopColor={colors.amberLight} stopOpacity={0.85} />
              <Stop offset="20%" stopColor={colors.amberLight} stopOpacity={0.65} />
              <Stop offset="28%" stopColor={colors.amber} stopOpacity={0.42} />
              <Stop offset="36%" stopColor={colors.amber} stopOpacity={0.25} />

              {/* 外层光晕 — 柔和扩散 */}
              <Stop offset="48%" stopColor={colors.amber} stopOpacity={0.13} />
              <Stop offset="60%" stopColor={colors.amberDark} stopOpacity={0.07} />
              <Stop offset="75%" stopColor={colors.amberDark} stopOpacity={0.03} />
              <Stop offset="90%" stopColor={colors.amberDark} stopOpacity={0.01} />
              <Stop offset="100%" stopColor={colors.amberDark} stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {/* 光晕圆 */}
          <Circle
            cx={center}
            cy={center}
            r={center}
            fill="url(#amberGlow)"
          />
        </Svg>
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
