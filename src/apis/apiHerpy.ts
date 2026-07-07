import {HERPY_SITE} from '../tools/static';
import type {SearchConfig, SiteConfig} from '../tools/types';

export type ApiResponse = {
  statusCode: number;
  data: string;
};

const DEFAULT_TIMEOUT = 30000;

const stripHash = (href: string) => href.split('#')[0];

const normalizePath = (href: string, site: SiteConfig) => {
  const withoutSite = href
    .replace(site.baseUrl, '')
    .replace(site.baseGalleryUrl, '')
    .replace(/^\/+/, '');

  return withoutSite.replace(/&amp;/g, '&');
};

const appendPage = (href: string, page: number) => {
  const cleaned = href
    .replace(/([?&])page=\d+(&?)/, (_match, prefix, tail) =>
      tail ? prefix : '',
    )
    .replace(/[?&]$/, '');
  const joiner = cleaned.includes('?') ? '&' : '?';

  return `${cleaned}${joiner}page=${page}`;
};

const request = async (
  href: string,
  site: SiteConfig = HERPY_SITE,
): Promise<ApiResponse> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
  const path = normalizePath(href, site);
  const url = `${site.baseUrl}/${path}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        // Herpy/Coppermine returns old table HTML. A browser-like Accept header
        // avoids some hosts returning a compressed or alternate body.
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    const data = await response.text();

    return {
      statusCode: response.status,
      data,
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const apiMainPage = (site?: SiteConfig) => request('', site);

export const apiClassificationPage = (href: string, site?: SiteConfig) =>
  request(href, site);

export const apiClassificationSwitchPage = (
  href: string,
  page = 1,
  site: SiteConfig = HERPY_SITE,
) => request(appendPage(normalizePath(href, site), Math.max(1, page)), site);

export const apiGetImageDetail = (href: string, site: SiteConfig = HERPY_SITE) =>
  request(stripHash(href), site);

export const apiGetSingleImgUrl = (href: string, site?: SiteConfig) =>
  request(href, site);

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

  return request(`thumbnails.php?search=${encodedKeyword}&${params}`, site);
};
