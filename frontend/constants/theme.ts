export const COLORS = {
  // Backgrounds
  background: '#0A0A0B',
  surface: '#1A1A1D',
  surfaceLight: '#252528',
  
  // Primary
  primary: '#9333EA',
  primaryLight: '#A855F7',
  primaryDark: '#7C3AED',
  
  // Secondary
  secondary: '#14B8A6',
  secondaryLight: '#2DD4BF',
  
  // Accent
  accent: '#F59E0B',
  accentLight: '#FBBF24',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  
  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  // Swipe Colors
  like: '#10B981',
  dislike: '#EF4444',
  superlike: '#F59E0B',
  
  // Others
  border: '#2D2D30',
  overlay: 'rgba(0, 0, 0, 0.7)',
  white: '#FFFFFF',
  black: '#000000',
};

export const FONTS = {
  regular: {
    fontWeight: '400' as const,
  },
  medium: {
    fontWeight: '500' as const,
  },
  semibold: {
    fontWeight: '600' as const,
  },
  bold: {
    fontWeight: '700' as const,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 6,
  },
};
