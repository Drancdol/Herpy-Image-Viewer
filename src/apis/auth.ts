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
