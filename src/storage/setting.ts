import {storage} from './mmkvStorage.ts';
import type {AppSettings, ThemeName} from '../tools/types';

const settingKeys: Record<keyof AppSettings, string> = {
  comicMode: 'settings.comicMode',
  preLoadRawImg: 'settings.preLoadRawImg',
  openSlideSwitch: 'settings.openSlideSwitch',
};

const themeKey = 'settings.theme';

export const loadStoredTheme = (defaultTheme: ThemeName): ThemeName => {
  const theme = storage.getString(themeKey);
  return theme === 'light' || theme === 'dark' ? theme : defaultTheme;
};

export const saveStoredTheme = (theme: ThemeName): void => {
  storage.set(themeKey, theme);
};

export const loadStoredSettings = (defaults: AppSettings): AppSettings => ({
  comicMode: storage.getBoolean(settingKeys.comicMode) ?? defaults.comicMode,
  preLoadRawImg:
    storage.getBoolean(settingKeys.preLoadRawImg) ?? defaults.preLoadRawImg,
  openSlideSwitch:
    storage.getBoolean(settingKeys.openSlideSwitch) ?? defaults.openSlideSwitch,
});

export const saveStoredSetting = (
  key: keyof AppSettings,
  value: boolean,
): void => {
  storage.set(settingKeys[key], value);
};
