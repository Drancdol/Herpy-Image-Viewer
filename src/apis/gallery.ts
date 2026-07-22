import {HERPY_SITE} from '../tools/static';
import type {SearchConfig, SiteConfig} from '../tools/types';
import {normalizePath, request} from './request';
import type {RequestSignal} from './request';

const stripHash = (href: string) => href.split('#')[0];

const appendPage = (href: string, page: number) => {
  const cleaned = href
    .replace(/([?&])page=\d+(&?)/, (_match, prefix, tail) =>
      tail ? prefix : '',
    )
    .replace(/[?&]$/, '');
  const joiner = cleaned.includes('?') ? '&' : '?';

  return `${cleaned}${joiner}page=${page}`;
};

export const apiMainPage = (site?: SiteConfig, options?: {signal?: RequestSignal}) =>
  request('', {site, ...options});

export const apiClassificationPage = (
  href: string,
  site?: SiteConfig,
  options?: {signal?: RequestSignal},
) => request(href, {site, ...options});

export const apiClassificationSwitchPage = (
  href: string,
  page = 1,
  site: SiteConfig = HERPY_SITE,
  options?: {signal?: RequestSignal},
) =>
  request(appendPage(normalizePath(href, site), Math.max(1, page)), {
    site,
    ...options,
  });

export const apiFavoriteGalleryPage = (
  page = 1,
  site: SiteConfig = HERPY_SITE,
  options?: {signal?: RequestSignal},
) =>
  apiClassificationSwitchPage('thumbnails.php?album=favpics', page, site, options);

export const apiGetImageDetail = (
  href: string,
  site: SiteConfig = HERPY_SITE,
  options?: {signal?: RequestSignal},
) => request(stripHash(href), {site, ...options});

export const apiGetSingleImgUrl = (
  href: string,
  site?: SiteConfig,
  options?: {signal?: RequestSignal},
) => request(href, {site, ...options});

export const apiSearch = (
  keyword: string[],
  config: SearchConfig,
  site: SiteConfig = HERPY_SITE,
  options?: {signal?: RequestSignal},
) => {
  const encodedKeyword = keyword
    .filter(Boolean)
    .map(v => encodeURIComponent(v.trim()))
    .join('+');

  const params = Object.entries(config)
    .filter(([key]) => key !== 'inputData')
    .map(([key, value]) => {
      const normalized =
        typeof value === 'boolean' ? (value ? 'on' : '') : String(value ?? '');
      return `${encodeURIComponent(key)}=${encodeURIComponent(normalized)}`;
    })
    .join('&');

  return request(`thumbnails.php?search=${encodedKeyword}&${params}`, {
    site,
    ...options,
  });
};
