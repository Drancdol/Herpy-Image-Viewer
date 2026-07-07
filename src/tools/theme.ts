import type {ThemeName} from './types';

export type ThemeColors = {
  name: ThemeName;
  background: string;
  surface: string;
  surfaceStrong: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primarySoft: string;
  accent: string;
  danger: string;
  chip: string;
  overlay: string;
};

export const THEMES: Record<ThemeName, ThemeColors> = {
  light: {
    name: 'light',
    background: '#f4f6f8',
    surface: '#ffffff',
    surfaceStrong: '#e8eef5',
    text: '#1f2933',
    textMuted: '#65748b',
    border: '#d7dee8',
    primary: '#2772d8',
    primarySoft: '#dcecff',
    accent: '#d7831e',
    danger: '#c54242',
    chip: '#e6f5fb',
    overlay: 'rgba(7, 18, 34, 0.45)',
  },
  dark: {
    name: 'dark',
    background: '#101820',
    surface: '#172330',
    surfaceStrong: '#213246',
    text: '#edf3f8',
    textMuted: '#a9b7c6',
    border: '#314356',
    primary: '#62a7ff',
    primarySoft: '#223a57',
    accent: '#f0a747',
    danger: '#ff7979',
    chip: '#263b49',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
};

export const getTheme = (theme: ThemeName): ThemeColors => THEMES[theme];
