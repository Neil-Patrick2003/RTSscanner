/**
 * Artemis design tokens, shared with the Artemis Creatives Tracker.
 *
 * Flat white (or near-black) surfaces, hairline borders, one emerald accent, and
 * small corner radii. Every token exists in both palettes so components can read
 * `theme.x` without branching on scheme.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#15191A',
    textSecondary: '#5C6461',
    placeholder: '#8A918E',
    chevron: '#8A918E',
    border: '#E3E7E5',
    inputBorder: '#D5DAD8',
    divider: '#EEF1EF',
    rowHover: '#F6F8F7',
    /** Links, active states, accents */
    primary: '#047857',
    primaryPressed: '#065F46',
    /** Filled button */
    button: '#047857',
    buttonPressed: '#065F46',
    onButton: '#FFFFFF',
    badge: '#F1F3F2',
    badgeActive: '#E6F4EE',
    focusRing: 'rgba(4, 120, 87, 0.2)',

    approved: '#047857',
    approvedFill: '#EEFBF5',
    approvedBorder: '#BFE8D6',
    rejected: '#B42318',
    rejectedFill: '#FEF3F2',
    rejectedBorder: '#F5C9C4',
  },
  dark: {
    background: '#121615',
    surface: '#1A1F1D',
    text: '#ECEFED',
    textSecondary: '#9BA4A0',
    placeholder: '#7A8380',
    chevron: '#6E7774',
    border: '#2A302E',
    inputBorder: '#2E3532',
    divider: '#1F2523',
    rowHover: '#1A1F1D',
    primary: '#34D399',
    primaryPressed: '#10B981',
    button: '#10B981',
    buttonPressed: '#059669',
    onButton: '#04241A',
    badge: '#1F2523',
    badgeActive: '#10261E',
    focusRing: 'rgba(52, 211, 153, 0.25)',

    approved: '#34D399',
    approvedFill: '#10261E',
    approvedBorder: '#1D4535',
    rejected: '#F38B85',
    rejectedFill: '#2B1716',
    rejectedBorder: '#4D2522',
  },
} as const;

export type Theme = (typeof Colors)['light'];
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Geist families as registered by `useFonts` in the root layout.
 * Use one family per weight instead of `fontWeight` so Android picks the right face.
 */
export const FontFamily = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  mono: Platform.select({ ios: 'Menlo', web: 'var(--font-mono)', default: 'monospace' }),
} as const;

/** 8pt grid. 4 and 12 are half-steps for use inside components only. */
export const Spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  10: 40,
  16: 64,
  24: 96,
} as const;

export const Radius = {
  /** Status labels, badges */
  sm: 4,
  /** Inputs, buttons, thumbnails */
  md: 6,
  /** Logo mark, large frames */
  lg: 10,
  pill: 999,
} as const;

export const IconSize = {
  topBar: 20,
  row: 22,
  strokeWidth: 1.75,
} as const;

export const MaxContentWidth = 800;
