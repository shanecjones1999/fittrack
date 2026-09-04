import { colors } from './colors';
import { fonts, fontSizes } from './typography';

export const theme = {
  colors,
  fonts,
  fontSizes,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 6,
    md: 10,
    pill: 999,
  },
} as const;

export { colors, fonts, fontSizes };
