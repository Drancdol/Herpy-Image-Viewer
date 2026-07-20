import axios, {
  AxiosHeaders,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import {saveAuthorizationCookies, getAuthorizationCookieHeader} from '../storage/authorization';
import {HERPY_SITE} from '../tools/static';
import type {SiteConfig} from '../tools/types';

export type ApiResponse = {
  statusCode: number;
  data: string;
};

export type RequestOptions = AxiosRequestConfig & {
  site?: SiteConfig;
};

const DEFAULT_TIMEOUT = 30000;

export const normalizePath = (href: string, site: SiteConfig) => {
  const withoutSite = href
    .replace(site.baseUrl, '')
    .replace(site.baseGalleryUrl, '')
    .replace(/^\/+/, '');

  return withoutSite.replace(/&amp;/g, '&');
};

const isAbsoluteUrl = (href: string) => /^https?:\/\//i.test(href);

const buildUrl = (href: string, site: SiteConfig) => {
  if (isAbsoluteUrl(href)) {
    return href;
  }

  const path = normalizePath(href, site);
  return path ? `${site.baseUrl}/${path}` : `${site.baseUrl}/`;
};

const getSetCookieHeader = (headers: unknown): unknown => {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }

  if ('get' in headers && typeof headers.get === 'function') {
    return headers.get('set-cookie');
  }

  const headerMap = headers as Record<string, unknown>;
  return headerMap['set-cookie'] ?? headerMap['Set-Cookie'];
};

export const apiClient = axios.create({
  timeout: DEFAULT_TIMEOUT,
  responseType: 'text',
  transformResponse: data => data,
  withCredentials: true,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const headers = AxiosHeaders.from(config.headers);
  headers.set(
    'Accept',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  );
  headers.set('Accept-Encoding', 'gzip, deflate');
  headers.set(
    'Accept-Language',
    'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,en-GB;q=0.6',
  );
  headers.set('Cache-Control', 'no-cache');
  headers.set('Connection', 'keep-alive');
  headers.set('Host', 'herpy.nu');
  headers.set('Pragma', 'no-cache');
  headers.set('Upgrade-Insecure-Requests', '1');
  headers.set(
    'User-Agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0',
  );
  const cookieHeader = getAuthorizationCookieHeader();
  if (cookieHeader) {
    headers.set('Cookie', cookieHeader);
  }

  config.headers = headers;
  return config;
});

apiClient.interceptors.response.use(response => {
  saveAuthorizationCookies(getSetCookieHeader(response.headers));
  return response;
});

export const request = async (
  href: string,
  options: RequestOptions = {},
): Promise<ApiResponse> => {
  const {site = HERPY_SITE, ...axiosOptions} = options;
  const response = await apiClient.request<string>({
    method: 'GET',
    ...axiosOptions,
    url: buildUrl(href, site),
  });

  return {
    statusCode: response.status,
    data: String(response.data ?? ''),
  };
};
