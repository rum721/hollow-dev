import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface ResponsiveInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  contentMaxWidth: number;
  chatMaxWidth: number;
  sidebarWidth: number;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  const breakpoint: Breakpoint =
    width >= 1024 ? 'desktop' : width >= 768 ? 'tablet' : 'mobile';

  return {
    width,
    height,
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    contentMaxWidth: breakpoint === 'desktop' ? 1200 : breakpoint === 'tablet' ? 768 : width,
    chatMaxWidth: breakpoint === 'desktop' ? 680 : breakpoint === 'tablet' ? 600 : width,
    sidebarWidth: breakpoint === 'desktop' ? 320 : 0,
  };
}
