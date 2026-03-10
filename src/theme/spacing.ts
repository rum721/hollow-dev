export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
  '6xl': 72,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/** Semantic layout tokens for page-level spacing (does not change base spacing) */
export const layout = {
  pagePaddingH: 20,
  sectionGap: 16,
  cardPadding: 16,
  cardGap: 12,
  itemGap: 8,
  messageGapSame: 4,
  messageGapDiff: 16,
} as const;
