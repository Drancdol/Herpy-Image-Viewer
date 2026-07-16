import {HERPY_SITE} from '../tools/static';
import type {SiteConfig} from '../tools/types';
import {request} from './request';

export type FavoriteAction = 'added' | 'removed' | null;

export const apiAddFav = (
  pid: number | string,
  site: SiteConfig = HERPY_SITE,
) => request(`addfav.php?pid=${encodeURIComponent(String(pid))}`, {site});

export const parseFavoriteAction = (html: string): FavoriteAction => {
  const messageHtml = html.match(
    /<div\b(?=[^>]*\bid\s*=\s*["']cpgMessage["'])[^>]*>[\s\S]*?<\/div>/i,
  )?.[0] ?? '';

  if (
    /\bcpg_message_success\b/i.test(messageHtml) &&
    /Picture\s+has\s+been\s+added\s+to\s+favorites/i.test(messageHtml)
  ) {
    return 'added';
  }

  if (
    /\bcpg_message_info\b/i.test(messageHtml) &&
    /Picture\s+has\s+been\s+removed\s+from\s+favorites/i.test(messageHtml)
  ) {
    return 'removed';
  }

  return null;
};
