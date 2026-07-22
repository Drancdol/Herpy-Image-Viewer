import {getLoginOutHref} from '../apis/auth';
import {apiGetImageDetail, apiGetSingleImgUrl, apiMainPage} from '../apis/gallery';
import {parseImageDetail, parseMainPage, parseRawImageSrc} from '../tools/process';
import type {ImageDetail, MainCategory, SiteConfig} from '../tools/types';

export type MainPageData = {
  categories: MainCategory[];
  loginOutHref: string;
};

export const fetchMainPage = async (
  site: SiteConfig,
  signal?: AbortSignal,
): Promise<MainPageData> => {
  const response = await apiMainPage(site, {signal});
  if (response.statusCode !== 200) {
    throw new Error(`main request failed: ${response.statusCode}`);
  }

  return {
    categories: parseMainPage(response.data),
    loginOutHref: getLoginOutHref(response.data),
  };
};

export const fetchImageDetail = async (
  href: string,
  site: SiteConfig,
  signal?: AbortSignal,
): Promise<ImageDetail> => {
  const response = await apiGetImageDetail(href, site, {signal});
  if (response.statusCode !== 200) {
    throw new Error(`detail request failed: ${response.statusCode}`);
  }

  const detail = parseImageDetail(response.data, href);
  if (!detail) {
    throw new Error('detail parse failed');
  }

  return detail;
};

export const fetchRawImageSrc = async (
  href: string,
  site: SiteConfig,
  signal?: AbortSignal,
) => {
  const response = await apiGetSingleImgUrl(href, site, {signal});
  if (response.statusCode !== 200) {
    throw new Error(`raw image request failed: ${response.statusCode}`);
  }

  return parseRawImageSrc(response.data);
};
