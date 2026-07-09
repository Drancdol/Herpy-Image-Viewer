import {storage} from './mmkvStorage';

const authorizationCookiesKey = 'authorization.cookies';

type CookieMap = Record<string, string>;

const loadCookieMap = (): CookieMap => {
  const raw = storage.getString(authorizationCookiesKey);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
};

const saveCookieMap = (cookies: CookieMap) => {
  storage.set(authorizationCookiesKey, JSON.stringify(cookies));
};

const splitCombinedSetCookie = (value: string): string[] =>
  value
    .replace(/^set-cookie:\s*/i, '')
    .split(/,(?=\s*[^;,=\s]+=)/)
    .map(item => item.trim())
    .filter(Boolean);

const normalizeSetCookieHeaders = (setCookie: unknown): string[] => {
  if (!setCookie) {
    return [];
  }

  if (Array.isArray(setCookie)) {
    return setCookie.flatMap(normalizeSetCookieHeaders);
  }

  if (typeof setCookie === 'string') {
    return splitCombinedSetCookie(setCookie);
  }

  return [];
};

const isExpiredCookie = (header: string): boolean => {
  if (/;\s*max-age=0(?:;|$)/i.test(header)) {
    return true;
  }

  const expires = header.match(/;\s*expires=([^;]+)/i)?.[1];
  if (!expires) {
    return false;
  }

  const expiresAt = Date.parse(expires);
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
};

export const saveAuthorizationCookies = (setCookie: unknown): void => {
  const cookieHeaders = normalizeSetCookieHeaders(setCookie);
  if (!cookieHeaders.length) {
    return;
  }

  const cookies = loadCookieMap();

  cookieHeaders.forEach(header => {
    const cookiePair = header.split(';')[0]?.trim();
    const equalIndex = cookiePair?.indexOf('=') ?? -1;
    if (!cookiePair || equalIndex <= 0) {
      return;
    }

    const name = cookiePair.slice(0, equalIndex).trim();
    const value = cookiePair.slice(equalIndex + 1).trim();
    if (!name) {
      return;
    }

    if (isExpiredCookie(header)) {
      delete cookies[name];
    } else {
      cookies[name] = value;
    }
  });

  saveCookieMap(cookies);
};

export const getAuthorizationCookieHeader = (): string => {
  const cookies = loadCookieMap();
  return Object.entries(cookies)
    .filter(([, value]) => value.length > 0)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
};

export const clearAuthorizationCookies = (): void => {
  storage.remove(authorizationCookiesKey);
};
