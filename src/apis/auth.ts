import {HERPY_SITE} from '../tools/static';
import type {SiteConfig} from '../tools/types';
import {request} from './request';
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
  Boolean(getLoginOutHref(html));

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
