export const colors = {
  background: '#FAF7F0',
  surface: '#FDFCF9',
  foreground: '#22221F',
  muted: '#EFEAE0',
  mutedForeground: '#7A7568',
  accent: '#B5502D',
  accentForeground: '#FFFFFF',
  border: '#E4DECF',
} as const;

export type ColorName = keyof typeof colors;
