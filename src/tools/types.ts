export type ThemeName = 'light' | 'dark';

export type RouteName =
  | 'home'
  | 'settings'
  | 'imageDetail'
  | 'search'
  | 'searchResult';

export type AppRoute =
  | {name: 'home'}
  | {name: 'settings'}
  | {name: 'search'}
  | {name: 'searchResult'; params: {config: SearchConfig}}
  | {name: 'imageDetail'; params: {image: GalleryImage}};

export type SiteConfig = {
  name: string;
  baseUrl: string;
  baseImageUrl: string;
  baseGalleryUrl: string;
};

export type AppSettings = {
  comicMode: boolean;
  preLoadRawImg: boolean;
  openSlideSwitch: boolean;
};

export type AlbumSummary = {
  subTitle: string;
  href: string;
  album: string;
  name: string;
  desc: string[];
};

export type MainCategory = {
  title: {
    name: string;
    href: string;
    desc?: string;
  };
  content: AlbumSummary[];
};

export type GalleryImage = {
  href: string;
  album: string;
  name: string;
  width: number;
  height: number;
};

export type PaginationInfo = {
  currentIndex: number;
  totalPages: number;
  totalNumber: number;
};

export type LinkValue = {
  name: string;
  href: string;
};

export type ImageDetail = {
  href: string;
  normalSrc: string;
  fullHref?: string | null;
  fullSrc?: string;
  title: string;
  width?: number;
  height?: number;
  info: Record<string, string | LinkValue[]>;
};

export type SearchConfig = {
  submit: 'search';
  album: 'search';
  newer_than: string;
  older_than: string;
  keywords: boolean;
  filename: boolean;
  owner_name: boolean;
  user1: boolean;
  title: boolean;
  caption: boolean;
  type: 'AND' | 'OR';
  inputData: string[];
  page?: number;
};
