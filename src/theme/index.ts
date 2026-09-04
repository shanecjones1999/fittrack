import {
  darkColors,
  lightColors,
  type ColorScheme,
  type ThemeColors,
} from './colors';
import { fonts, fontSizes } from './typography';

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

const radius = {
  sm: 6,
  md: 10,
  pill: 999,
} as const;

export type AppTheme = {
  colorScheme: ColorScheme;
  colors: ThemeColors;
  fonts: typeof fonts;
  fontSizes: typeof fontSizes;
  spacing: typeof spacing;
  radius: typeof radius;
};

export function createTheme(colorScheme: ColorScheme): AppTheme {
  return {
    colorScheme,
    colors: colorScheme === 'dark' ? darkColors : lightColors,
    fonts,
    fontSizes,
    spacing,
    radius,
  };
}

/** Default light theme for boot UI before settings are ready. */
export const theme = createTheme('light');

export { fonts, fontSizes, lightColors, darkColors };
export type { ColorScheme, ThemeColors };
