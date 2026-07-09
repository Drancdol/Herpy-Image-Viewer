import {HERPY_SITE} from '../tools/static';
import type {SearchConfig, SiteConfig} from '../tools/types';
import {normalizePath, request} from './request';
import type {ApiResponse} from './request';

export type {ApiResponse} from './request';

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

const formEncode = (data: Record<string, string>) =>
  Object.entries(data)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join('&');

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const extractCpgMessage = (html: string) => {
  const match = html.match(
    /<div\b(?=[^>]*\bid=["']cpgMessage["'])[^>]*>([\s\S]*?)<\/div>/i,
  );

  return {
    className: match?.[0].match(/\bclass=["']([^"']+)["']/i)?.[1] ?? '',
    message: match ? stripHtml(match[1]) : '',
  };
};

export type LoginResult = ApiResponse & {
  success: boolean;
  message: string;
};

export const apiLogin = async (
  username: string,
  password: string,
  site: SiteConfig = HERPY_SITE,
  referer = `${site.baseUrl}/`,
): Promise<LoginResult> => {
  const response = await request(
    `${site.baseUrl}/login.php?referer=${encodeURIComponent(referer)}`,
    {
      method: 'POST',
      site,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: formEncode({
        username,
        password,
        submitted: 'OK',
        remember_me: '1',
      }),
    },
  );
  const cpgMessage = extractCpgMessage(response.data);
  const success =
    /cpg_message_success/i.test(cpgMessage.className) ||
    /Welcome\s+/i.test(cpgMessage.message);

  return {
    ...response,
    success,
    message:
      cpgMessage.message ||
      (success ? 'Login succeeded.' : 'Login failed. Try again.'),
  };
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

export const apiGetImageDetail = (href: string, site: SiteConfig = HERPY_SITE) =>
  request(stripHash(href), {site});

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
