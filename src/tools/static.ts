import type {SearchConfig, SiteConfig} from './types';

export const HERPY_SITE: SiteConfig = {
  name: 'Herpy',
  baseUrl: 'http://herpy.nu/gallery',
  baseImageUrl: 'http://herpy.nu/gallery',
  baseGalleryUrl: 'http://herpy.nu/gallery',
};

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  submit: 'search',
  album: 'search',
  newer_than: '',
  older_than: '',
  keywords: true,
  filename: true,
  owner_name: true,
  user1: false,
  title: true,
  caption: false,
  type: 'AND',
  inputData: [],
};

export const IMAGE_TYPES = ['png', 'jpg', 'jpeg', 'gif', 'ico'];
