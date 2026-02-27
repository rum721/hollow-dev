export const colors = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#242424',
  border: '#2A2A2A',

  amber: '#D4A574',
  amberLight: '#E8C9A0',
  amberDark: '#B8875A',
  amberMuted: 'rgba(212, 165, 116, 0.15)',
  amberGlow: 'rgba(212, 165, 116, 0.3)',

  textPrimary: '#F5F0EB',
  textSecondary: '#8A8A8A',
  textAI: '#B0B0B0',
  textMuted: '#5A5A5A',

  danger: '#E74C3C',
  dangerMuted: 'rgba(231, 76, 60, 0.15)',
  success: '#4CAF50',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  tabBar: 'rgba(10, 10, 10, 0.85)',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ColorToken = keyof typeof colors;
