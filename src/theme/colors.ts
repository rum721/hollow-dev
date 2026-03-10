export const colors = {
  // Surfaces
  background: '#0A0A0A',
  surface: '#131313',
  surfaceLight: '#1C1C1C',
  surfaceOverlay: '#242424',
  border: '#1C1C1C',

  // Gold tiers
  amber: '#D4A574',
  amberLight: '#E8C09A',
  amberDark: '#B8875A',
  amberHover: '#E0B88A',
  amberAux: 'rgba(212, 165, 116, 0.50)',
  amberMuted: 'rgba(212, 165, 116, 0.15)',
  amberGlow: 'rgba(212, 165, 116, 0.3)',

  // Text (rgba for precise opacity control)
  textPrimary: 'rgba(255, 255, 255, 0.87)',
  textSecondary: 'rgba(255, 255, 255, 0.60)',
  textAI: 'rgba(255, 255, 255, 0.72)',
  textMuted: 'rgba(255, 255, 255, 0.38)',
  textTimestamp: 'rgba(255, 255, 255, 0.38)',
  textTimestampHover: 'rgba(255, 255, 255, 0.60)',
  textInverse: '#1A1A0A',

  // Status
  danger: '#C45C5C',
  dangerMuted: 'rgba(196, 92, 92, 0.15)',
  success: '#5C8A6E',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  tabBar: 'rgba(10, 10, 10, 0.85)',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ColorToken = keyof typeof colors;
