export const colors = {
  background: '#0A0A0B',
  surface: '#141416',
  surfaceLight: '#1E1E22',
  border: '#1E1E22',

  amber: '#D4A574',
  amberLight: '#E8C9A0',
  amberDark: '#B8875A',
  amberHover: '#E0B88A',
  amberMuted: 'rgba(212, 165, 116, 0.15)',
  amberGlow: 'rgba(212, 165, 116, 0.3)',

  textPrimary: '#E8E4DF',
  textSecondary: '#8A8680',
  textAI: '#B0ACA7',
  textMuted: '#4A4844',
  textTimestamp: '#4A4844',
  textTimestampHover: '#8A8680',

  danger: '#C45C5C',
  dangerMuted: 'rgba(196, 92, 92, 0.15)',
  success: '#5C8A6E',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  tabBar: 'rgba(10, 10, 11, 0.85)',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ColorToken = keyof typeof colors;
