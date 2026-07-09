import {storage} from './mmkvStorage';

const authorizationCookiesKey = 'authorization.cookies';

type CookieEntry = {
  value: string;
  expiresAt?: number;
};

type CookieMap = Record<string, CookieEntry>;

const normalizeCookieEntry = (value: unknown): CookieEntry | null => {
  if (typeof value === 'string') {
    return value ? {value} : null;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const rawValue = (value as {value?: unknown}).value;
  const rawExpiresAt = (value as {expiresAt?: unknown}).expiresAt;
  if (typeof rawValue !== 'string' || !rawValue) {
    return null;
  }

  return {
    value: rawValue,
    expiresAt:
      typeof rawExpiresAt === 'number' && Number.isFinite(rawExpiresAt)
        ? rawExpiresAt
        : undefined,
  };
};

const loadCookieMap = (): CookieMap => {
  const raw = storage.getString(authorizationCookiesKey);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<CookieMap>((acc, [name, value]) => {
      const entry = normalizeCookieEntry(value);
      if (entry) {
        acc[name] = entry;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const saveCookieMap = (cookies: CookieMap) => {
  if (!Object.keys(cookies).length) {
    storage.remove(authorizationCookiesKey);
    return;
  }

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

const parseCookieExpiresAt = (header: string): number | undefined => {
  const maxAge = header.match(/;\s*max-age=(-?\d+)(?:;|$)/i)?.[1];
  if (maxAge) {
    const seconds = Number(maxAge);
    if (Number.isFinite(seconds)) {
      return Date.now() + seconds * 1000;
    }
  }

  const expires = header.match(/;\s*expires=([^;]+)/i)?.[1];
  if (!expires) {
    return undefined;
  }

  const expiresAt = Date.parse(expires);
  return Number.isFinite(expiresAt) ? expiresAt : undefined;
};

const isCookieEntryExpired = (cookie: CookieEntry): boolean =>
  typeof cookie.expiresAt === 'number' && cookie.expiresAt <= Date.now();

const isExpiredCookie = (header: string): boolean => {
  const expiresAt = parseCookieExpiresAt(header);
  return typeof expiresAt === 'number' && expiresAt <= Date.now();
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
      cookies[name] = {
        value,
        expiresAt: parseCookieExpiresAt(header),
      };
    }
  });

  saveCookieMap(cookies);
};

export const getAuthorizationCookieHeader = (): string => {
  const cookies = loadCookieMap();
  return Object.entries(cookies)
    .filter(([, entry]) => entry.value.length > 0 && !isCookieEntryExpired(entry))
    .map(([name, entry]) => `${name}=${entry.value}`)
    .join('; ');
};

export const hasAuthorizationCookies = (): boolean =>
  getAuthorizationCookieHeader().length > 0;

export const clearExpiredAuthorizationCookies = (): boolean => {
  const cookies = loadCookieMap();
  let changed = false;

  const nextCookies = Object.entries(cookies).reduce<CookieMap>(
    (acc, [name, entry]) => {
      if (isCookieEntryExpired(entry)) {
        changed = true;
        return acc;
      }

      acc[name] = entry;
      return acc;
    },
    {},
  );

  if (changed) {
    saveCookieMap(nextCookies);
  }

  return changed;
};

export const clearAuthorizationCookies = (): void => {
  storage.remove(authorizationCookiesKey);
};
