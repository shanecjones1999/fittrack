export type ColorScheme = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
};

export const lightColors: ThemeColors = {
  background: '#FAF7F0',
  surface: '#FDFCF9',
  foreground: '#22221F',
  muted: '#EFEAE0',
  mutedForeground: '#7A7568',
  accent: '#B5502D',
  accentForeground: '#FFFFFF',
  border: '#E4DECF',
};

export const darkColors: ThemeColors = {
  background: '#161512',
  surface: '#1F1D19',
  foreground: '#F2EDE3',
  muted: '#2A2722',
  mutedForeground: '#A39E91',
  accent: '#C9653F',
  accentForeground: '#FFFFFF',
  border: '#3A3630',
};

/** @deprecated Prefer useTheme(). Kept for boot UI before settings load. */
export const colors = lightColors;

export type ColorName = keyof ThemeColors;
