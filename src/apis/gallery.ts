import {HERPY_SITE} from '../tools/static';
import type {SearchConfig, SiteConfig} from '../tools/types';
import {normalizePath, request} from './request';

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

export const apiMainPage = (site?: SiteConfig) => request('', {site});

export const apiClassificationPage = (href: string, site?: SiteConfig) =>
  request(href, {site});

export const apiClassificationSwitchPage = (
  href: string,
  page = 1,
  site: SiteConfig = HERPY_SITE,
) =>
  request(appendPage(normalizePath(href, site), Math.max(1, page)), {site});

export const apiGetImageDetail = (
  href: string,
  site: SiteConfig = HERPY_SITE,
) => request(stripHash(href), {site});

export const apiGetSingleImgUrl = (href: string, site?: SiteConfig) =>
  request(href, {site});

export const apiSearch = (
  keyword: string[],
  config: SearchConfig,
  site: SiteConfig = HERPY_SITE,
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

  return request(`thumbnails.php?search=${encodedKeyword}&${params}`, {site});
};
