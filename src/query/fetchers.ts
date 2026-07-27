import {getLoginOutHref} from '../apis/auth';
import {
  apiGetImageDetail,
  apiGetSingleImgUrl,
  apiMainPage,
} from '../apis/gallery';
import {
  isUserProfileLoginRequired,
  parseImageDetail,
  parseMainPage,
  parseRawImageSrc,
  parseUserProfile,
} from '../tools/process';
import {
  apiGetUserProfile
} from '../apis/auth'
import type {UserData} from '../storage/user';
import type {ImageDetail, MainCategory, SiteConfig} from '../tools/types';

export type MainPageData = {
  categories: MainCategory[];
  loginOutHref: string;
  userName: string;
};

export type UserProfilePageData =
  | {loginRequired: true}
  | {loginRequired: false; user: UserData; loginOutHref: string};

export const fetchMainPage = async (
  site: SiteConfig,
  signal?: AbortSignal,
): Promise<MainPageData> => {
  const response = await apiMainPage(site, {signal});
  if (response.statusCode !== 200) {
    throw new Error(`main request failed: ${response.statusCode}`);
  }
  let aTag = getLoginOutHref(response.data);
  return {
    categories: parseMainPage(response.data),
    loginOutHref: aTag.href,
    userName: aTag.userName,
  };
};

export const fetchUserProfile = async (
  site: SiteConfig,
  signal?: AbortSignal,
): Promise<UserProfilePageData> => {
  const response = await apiGetUserProfile(site, {signal});
  if (response.statusCode !== 200) {
    throw new Error(`profile request failed: ${response.statusCode}`);
  }

  if (isUserProfileLoginRequired(response.data)) {
    return {loginRequired: true};
  }

  const user = parseUserProfile(response.data);
  if (!user) {
    throw new Error('profile parse failed');
  }

  return {
    loginRequired: false,
    user,
    loginOutHref: getLoginOutHref(response.data).href,
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
