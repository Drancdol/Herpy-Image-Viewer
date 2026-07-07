import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {DEFAULT_SEARCH_CONFIG, HERPY_SITE} from '../tools/static';
import type {
  AppSettings,
  GalleryImage,
  SearchConfig,
  SiteConfig,
  ThemeName,
} from '../tools/types';

type AppState = {
  site: SiteConfig;
  theme: ThemeName;
  settings: AppSettings;
  selectedAlbumHref: string | null;
  upNextCache: GalleryImage[];
  searchHistory: string[];
};

const defaultSettings: AppSettings = {
  comicMode: false,
  preLoadRawImg: false,
  openSlideSwitch: false,
};

const initialState: AppState = {
  site: HERPY_SITE,
  theme: 'light',
  settings: defaultSettings,
  selectedAlbumHref: null,
  upNextCache: [],
  searchHistory: [],
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeName>) {
      state.theme = action.payload;
    },
    updateSetting(
      state,
      action: PayloadAction<{key: keyof AppSettings; value: boolean}>,
    ) {
      state.settings[action.payload.key] = action.payload.value;
    },
    selectAlbum(state, action: PayloadAction<string | null>) {
      state.selectedAlbumHref = action.payload;
    },
    setUpNextCache(state, action: PayloadAction<GalleryImage[]>) {
      state.upNextCache = action.payload;
    },
    addSearchHistory(state, action: PayloadAction<string>) {
      const normalized = action.payload.trim();
      if (!normalized) {
        return;
      }

      state.searchHistory = [
        normalized,
        ...state.searchHistory.filter(item => item !== normalized),
      ].slice(0, 50);
    },
  },
});

export const createSearchConfig = (
  patch: Partial<SearchConfig> = {},
): SearchConfig => ({
  ...DEFAULT_SEARCH_CONFIG,
  ...patch,
  inputData: patch.inputData ?? [...DEFAULT_SEARCH_CONFIG.inputData],
});

export const appActions = appSlice.actions;
export const appReducer = appSlice.reducer;
