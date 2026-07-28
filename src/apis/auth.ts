import {HERPY_SITE} from '../tools/static';
import type { SiteConfig} from '../tools/types';
import {request, type RequestSignal } from './request';
import type {ApiResponse} from './request';

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

export const getLoginOutHref = (html: string): { href: string; userName: string } => {
  // 正则新增第3捕获组：\[([^\]]+)\] 匹配括号内用户名
  const reg =
    /<a\b[^>]*\bhref\s*=\s*(["'])(\/?logout\.php\?[^"']*)\1[^>]*>\s*logout\s*\[([^\]]+)\]\s*<\/a>/i;
  const matchResult = html.match(reg);

  if (!matchResult) {
    return {
      href: '',
      userName: '',
    };
  }

  // 第2分组 链接，第3分组 括号内用户名
  let rawHref = matchResult[2];
  const userName = matchResult[3].trim();

  // 原有链接处理
  const realHref = rawHref.replace(/&amp;/gi, '&').split(/&referer=/i)[0];

  return {
    href: realHref,
    userName: userName,
  };
};

export const hasLoggedInAccount = (html: string): boolean =>
  Boolean(getLoginOutHref(html).href);

export const isLogoutSuccessful = (html: string): boolean => {
  const messageHtml = html.match(
    /<div\b(?=[^>]*\bid\s*=\s*["']cpgMessage["'])(?=[^>]*\bclass\s*=\s*["'][^"']*\bcpg_user_message\b[^"']*["'])(?=[^>]*\bclass\s*=\s*["'][^"']*\bcpg_message_info\b[^"']*["'])[^>]*>([\s\S]*?)<\/div>/i,
  )?.[1] ?? '';

  return /^Bye\s+bye\s+.+?\s+\.\.\.$/i.test(stripHtml(messageHtml));
};

const extractLoginMessage = (html: string) => {
  const wrapperMatch = html.match(
    /<div\b(?=[^>]*\bclass=["'][^"']*\bcpg_message_(?:success|validation|warning)\b[^"']*["'])[^>]*>([\s\S]*?)<\/div>/i,
  );

  const className =
    wrapperMatch?.[0].match(/\bclass=["']([^"']+)["']/i)?.[1] ?? '';
  const userMessage =
    wrapperMatch?.[1].match(
      /<span\b(?=[^>]*\bclass=["'][^"']*\bcpg_user_message\b[^"']*["'])[^>]*>([\s\S]*?)<\/span>/i,
    )?.[1] ?? wrapperMatch?.[1] ?? '';

  return {
    className,
    message: stripHtml(userMessage),
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
  const loginMessage = extractLoginMessage(response.data);
  const alreadyLoggedIn = /you are already logged in!/i.test(
    loginMessage.message,
  );
  const success =
    /cpg_message_success/i.test(loginMessage.className) ||
    /Welcome\s+/i.test(loginMessage.message) ||
    alreadyLoggedIn;

  return {
    ...response,
    success,
    message:
      loginMessage.message ||
      (success ? 'Login succeeded.' : 'Login failed. Try again.'),
  };
};

export type LogoutResult = ApiResponse & {
  success: boolean;
};
// using for UserUpdatePage
export type UserProfileUpdateValues = {
  location: string;
  interests: string;
  website: string;
  occupation: string;
  biography: string;
};

export type UserProfileUpdateResult = ApiResponse & {
  success: boolean;
  message: string;
  loginOutHref: string;
};

type ProfileFormTokens = {
  formToken: string;
  timestamp: string;
};

const getProfileFormTokens = (
  loginOutHref: string,
  site: SiteConfig,
): ProfileFormTokens | null => {
  if (!loginOutHref.trim()) {
    return null;
  }
  try {
    const logoutUrl = new URL(
      loginOutHref.replace(/&amp;/gi, '&'),
      `${site.baseUrl.replace(/\/+$/, '')}/`,
    );
    const formToken = logoutUrl.searchParams.get('form_token')?.trim();
    const timestamp = logoutUrl.searchParams.get('timestamp')?.trim();

    return formToken && timestamp ? {formToken, timestamp} : null;
  } catch {
    return null;
  }
};

const getProfileUpdateMessage = (html: string) => {
  const messageHtml =
    html.match(
      /<div\b(?=[^>]*\bid\s*=\s*["']cpgMessage["'])[^>]*>([\s\S]*?)<\/div>/i,
    )?.[1] ??
    html.match(
      /<span\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bcpg_user_message\b[^"']*["'])[^>]*>([\s\S]*?)<\/span>/i,
    )?.[1] ??
    '';

  return stripHtml(messageHtml);
};

const isProfileUpdateSuccessful = (html: string): boolean =>
  /<span\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bcpg_user_message\b[^"']*["'])[^>]*>\s*Your\s+profile\s+was\s+updated\s*<\/span>/i.test(
    html,
  );

const isPasswordUpdateSuccessful = (html: string): boolean => {
  const messageHtml = html.match(
    /<div\b(?=[^>]*\bid\s*=\s*["']cpgMessage["'])(?=[^>]*\bclass\s*=\s*["'][^"']*\bcpg_user_message\b[^"']*["'])(?=[^>]*\bclass\s*=\s*["'][^"']*\bcpg_message_success\b[^"']*["'])[^>]*>([\s\S]*?)<\/div>/i,
  )?.[1] ?? '';

  return /^Your\s+password\s+was\s+changed$/i.test(stripHtml(messageHtml));
};

const submitProfileForm = async (
  params: string,
  site: SiteConfig,
  successMessage: string,
  isSuccessful: (html: string) => boolean,
): Promise<UserProfileUpdateResult> => {
  const response = await request('profile.php', {
    method: 'POST',
    site,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': 'http://herpy.nu/gallery/profile.php?op=edit_profile'
    },
    data: params
  });
  const message = getProfileUpdateMessage(response.data);
  const success =
    response.statusCode >= 200 &&
    response.statusCode < 300 &&
    isSuccessful(response.data);

  return {
    ...response,
    success,
    message:
      message ||
      (success ? successMessage : 'Update failed. Please try again.'),
    loginOutHref: getLoginOutHref(response.data).href,
  };
};

const createProfileFormParams = (loginOutHref: string, site: SiteConfig): ProfileFormTokens => {
  const tokens = getProfileFormTokens(loginOutHref, site);
  if (!tokens) {
    throw new Error('Login credentials have expired. Refresh your profile and try again.');
  }
  return tokens;
};

export const apiUpdateUserProfile = async (
  values: UserProfileUpdateValues,
  loginOutHref: string,
  site: SiteConfig = HERPY_SITE,
): Promise<UserProfileUpdateResult> => {
  const params = createProfileFormParams(loginOutHref, site);
  let data = formEncode({
    user_profile1: values.location,
    user_profile2: values.interests,
    user_profile3: values.website,
    user_profile4: values.occupation,
    user_profile6: values.biography,
    form_token: params.formToken,
    timestamp: params.timestamp,
    change_profile: 'Apply+changes'
  });
  return submitProfileForm(data, site, 'Profile updated.', isProfileUpdateSuccessful);
};

export const apiUpdateUserPassword = async (
  currentPassword: string,
  newPassword: string,
  loginOutHref: string,
  site: SiteConfig = HERPY_SITE,
): Promise<UserProfileUpdateResult> => {
  const params = createProfileFormParams(loginOutHref, site);
  const values = {
    current_pass: currentPassword,
    new_pass: newPassword,
    new_pass_again: newPassword,
    change_password: 'Change+my+password',
    form_token: params.formToken,
    timestamp: params.timestamp
  };
  const data = formEncode(values);
  return submitProfileForm(data, site, 'Password updated.', isPasswordUpdateSuccessful);
};
//-------------------------
export const apiLogout = async (
  loginOutHref: string,
  site: SiteConfig = HERPY_SITE,
): Promise<LogoutResult> => {
  const response = await request(loginOutHref, {
    site,
    persistAuthorizationCookies: false,
  });

  return {
    ...response,
    success: response.statusCode === 200 && isLogoutSuccessful(response.data),
  };
};
export const apiGetUserProfile = (site: SiteConfig = HERPY_SITE, options?: { signal?: RequestSignal }) =>
  request('profile.php?op=edit_profile', { site, ...options });
