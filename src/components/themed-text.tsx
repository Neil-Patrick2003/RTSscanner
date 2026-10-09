import { StyleSheet, Text, type TextProps } from 'react-native';

import { FontFamily, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Artemis type scale: Geist throughout, mono only for scanned codes. */
const TYPES = StyleSheet.create({
  wordmark: { fontFamily: FontFamily.bold, fontSize: 36, lineHeight: 40, letterSpacing: 5.76 },
  pageTitle: { fontFamily: FontFamily.semibold, fontSize: 17, lineHeight: 24, letterSpacing: -0.17 },
  input: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 20 },
  button: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 },
  rowTitle: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: FontFamily.medium, fontSize: 13, lineHeight: 16 },
  labelActive: { fontFamily: FontFamily.semibold, fontSize: 13, lineHeight: 16 },
  meta: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 16 },
  eyebrow: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
  },
  sectionLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.88,
    textTransform: 'uppercase',
  },
  caption: { fontFamily: FontFamily.semibold, fontSize: 11, lineHeight: 16 },
  code: { fontFamily: FontFamily.mono, fontSize: 12, lineHeight: 16 },
});

export type TextType = keyof typeof TYPES;

export type ThemedTextProps = TextProps & {
  type?: TextType;
  tone?: ThemeColor;
};

export function ThemedText({ type = 'body', tone = 'text', style, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return <Text style={[TYPES[type], { color: theme[tone] }, style]} {...rest} />;
}
