import {HERPY_SITE} from './static';
import type {UserData} from '../storage/user';
import type {
  AlbumSummary,
  GalleryImage,
  ImageDetail,
  LinkValue,
  MainCategory,
  PaginationInfo,
  SiteConfig,
} from './types';

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export const decodeHtml = (value = '') =>
  value
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&([a-zA-Z]+);/g, (_match, code) => ENTITY_MAP[code] ?? _match);

export const cleanText = (value = '') =>
  decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
    .trim(),
  );

const createEmptyUserData = (): UserData => ({
  username: '',
  status: '',
  joinDate: '',
  group: '',
  email: '',
  location: '',
  interests: '',
  website: '',
  occupation: '',
  biography: '',
  diskUsage: '',
  filesUploaded: '',
  lastComment: '',
  lastUploadedFile: '',
});

const extractProfileForm = (html: string) =>
  html.match(
    /<form\b(?=[^>]*\bid\s*=\s*["']cpgform["'])[^>]*>([\s\S]*?)<\/form>/i,
  )?.[1] ?? '';

const parseProfileRows = (html: string) => {
  const values = new Map<string, string>();
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(html))) {
    const cells = [...rowMatch[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
    if (cells.length !== 2) {
      continue;
    }

    const label = cleanText(cells[0][1]).replace(/:$/, '').toLowerCase();
    if (label) {
      values.set(label, cleanText(cells[1][1]));
    }
  }

  return values;
};

const getNamedInputValue = (html: string, name: string) => {
  const inputRegex = /<input\b[^>]*>/gi;
  let inputMatch: RegExpExecArray | null;

  while ((inputMatch = inputRegex.exec(html))) {
    if (getAttribute(inputMatch[0], 'name') === name) {
      return getAttribute(inputMatch[0], 'value');
    }
  }

  return '';
};

const getNamedTextareaValue = (html: string, name: string) => {
  const textareaRegex = /<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/gi;
  let textareaMatch: RegExpExecArray | null;

  while ((textareaMatch = textareaRegex.exec(html))) {
    if (getAttribute(textareaMatch[1], 'name') === name) {
      return cleanText(textareaMatch[2]);
    }
  }

  return '';
};

export const isUserProfileLoginRequired = (html: string): boolean =>
  /\bcpg_message_warning\b/i.test(html) &&
  /you\s+don't\s+have\s+permission\s+to\s+access\s+this\s+page\.?/i.test(
    cleanText(html),
  );

export const parseUserProfile = (html: string): UserData | null => {
  const formHtml = extractProfileForm(html);
  if (!formHtml) {
    return null;
  }

  const rows = parseProfileRows(formHtml);
  const username = rows.get('username') ?? '';
  if (!username) {
    return null;
  }

  return {
    ...createEmptyUserData(),
    username,
    status: rows.get('status') ?? '',
    joinDate: rows.get('joined') ?? '',
    group: rows.get('group') ?? '',
    email: rows.get('email') ?? '',
    location: getNamedInputValue(formHtml, 'user_profile1'),
    interests: getNamedInputValue(formHtml, 'user_profile2'),
    website: getNamedInputValue(formHtml, 'user_profile3'),
    occupation: getNamedInputValue(formHtml, 'user_profile4'),
    biography: getNamedTextareaValue(formHtml, 'user_profile6'),
    diskUsage: rows.get('disk usage') ?? '',
    filesUploaded: rows.get('files uploaded') ?? '',
    lastComment: rows.get('last comment') ?? '',
    lastUploadedFile: rows.get('last uploaded file') ?? '',
  };
};

export const normalizeHref = (href = '') =>
  decodeHtml(href).replace(/^\/+/, '').split('#')[0];

export const absoluteImageUrl = (
  src?: string,
  site: SiteConfig = HERPY_SITE,
) => {
  if (!src) {
    return '';
  }
  if (/^https?:\/\//i.test(src)) {
    return src;
  }

  return `${site.baseGalleryUrl}/${src.replace(/^\/+/, '')}`;
};

const getAttribute = (html: string, name: string) => {
  const match = html.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match ? decodeHtml(match[1]) : '';
};

const toNumber = (value?: string) => {
  const parsed = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const parseLinkList = (html: string): LinkValue[] => {
  const links: LinkValue[] = [];
  const linkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html))) {
    const name = cleanText(match[2]);
    if (name) {
      links.push({
        name,
        href: normalizeHref(match[1]),
      });
    }
  }

  return links;
};

export const parseMainPage = (html: string): MainCategory[] => {
  const categories: MainCategory[] = [];
  const catRegex =
    /<td\b[^>]*class=["']catrow["'][^>]*align=["']left["'][^>]*>[\s\S]*?<span\b[^>]*class=["']catlink["'][^>]*>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/span>([\s\S]*?)<\/td>/gi;
  const starts: Array<{
    index: number;
    href: string;
    name: string;
    desc: string;
  }> = [];
  let catMatch: RegExpExecArray | null;

  while ((catMatch = catRegex.exec(html))) {
    starts.push({
      index: catMatch.index,
      href: normalizeHref(catMatch[1]),
      name: cleanText(catMatch[2]),
      desc: cleanText(catMatch[3]),
    });
  }

  starts.forEach((cat, index) => {
    const nextCat = starts[index + 1]?.index ?? html.length;
    const segment = html.slice(cat.index, nextCat);
    const content = parseAlbumSummaries(segment);

    if (cat.name && content.length > 0) {
      categories.push({
        title: {
          name: cat.name,
          href: cat.href,
          desc: cat.desc,
        },
        content,
      });
    }
  });

  return categories;
};

const parseAlbumSummaries = (html: string): AlbumSummary[] => {
  const albums: AlbumSummary[] = [];
  const albumRegex =
    /<span\b[^>]*class=["']alblink["'][^>]*>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<img\b([^>]*class=["']image thumbnail["'][^>]*)>[\s\S]*?<td\b[^>]*class=["']tableb tableb_alternate["'][^>]*>\s*<p>([\s\S]*?)<\/p>\s*<p\b[^>]*class=["']album_stat["'][^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;

  while ((match = albumRegex.exec(html))) {
    const imageAttrs = match[3];
    const desc = [cleanText(match[4]), ...cleanText(match[5]).split(/\n|(?=Album viewed)/)]
      .map(item => item.trim())
      .filter(Boolean);

    albums.push({
      subTitle: cleanText(match[2]),
      href: normalizeHref(match[1]),
      album: getAttribute(imageAttrs, 'src'),
      name: desc[0] ?? '',
      desc: desc.slice(1),
    });
  }

  return albums;
};

export const parseGalleryImages = (html: string): GalleryImage[] => {
  const images: GalleryImage[] = [];
  const seen = new Set<string>();
  const thumbRegex =
    /<td\b[^>]*class=["'][^"']*\bthumbnails\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<img\b([^>]*class=["']image thumbnail["'][^>]*)>[\s\S]*?<span\b[^>]*class=["']thumb_title thumb_title_title["'][^>]*>([\s\S]*?)<\/span>/gi;
  let match: RegExpExecArray | null;

  while ((match = thumbRegex.exec(html))) {
    const href = normalizeHref(match[1]).replace('?album=search&', '?');
    if (seen.has(href)) {
      continue;
    }

    const imageAttrs = match[2];
    seen.add(href);
    images.push({
      href,
      album: getAttribute(imageAttrs, 'src'),
      width: toNumber(getAttribute(imageAttrs, 'width')),
      height: toNumber(getAttribute(imageAttrs, 'height')),
      name: cleanText(match[3]),
    });
  }

  return images;
};

export const parsePagination = (
  html: string,
  currentIndex: number,
): PaginationInfo => {
  const text = cleanText(html);
  const match = text.match(/([\d,]+)\s+files\s+on\s+([\d,]+)\s+page/i);

  return {
    currentIndex,
    totalNumber: match ? toNumber(match[1]) : 0,
    totalPages: match ? toNumber(match[2]) : 1,
  };
};

export const parseImageDetail = (
  html: string,
  href: string,
): ImageDetail | null => {
  const imageTagMatch = html.match(/<img\b[^>]*class=["']image["'][^>]*>/i);
  const imageTag = imageTagMatch?.[0];

  if (!imageTag) {
    return null;
  }

  const detail: ImageDetail = {
    href: normalizeHref(href),
    normalSrc: getAttribute(imageTag, 'src'),
    fullHref: extractRawPageHref(html),
    width: toNumber(getAttribute(imageTag, 'width')),
    height: toNumber(getAttribute(imageTag, 'height')),
    title: parseTitle(html),
    info: {},
  };

  // Coppermine renders the metadata table as label/value pairs. Keeping the
  // original labels avoids losing fields when the source page adds new rows.
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(html))) {
    const cells = [...rowMatch[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
    if (cells.length !== 2) {
      continue;
    }

    const label = cleanText(cells[0][1]);
    const valueHtml = cells[1][1];
    const links = parseLinkList(valueHtml);
    if (!label) {
      continue;
    }
    detail.info[label] = links.length > 0 ? links : cleanText(valueHtml);
  }

  return detail;
};

export const extractRawPageHref = (html: string) => {
  const match = html.match(/MM_openBrWindow\('([^']+)'/i);
  return match ? normalizeHref(match[1]) : null;
};

export const parseRawImageSrc = (html: string) => {
  const match = html.match(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/i);
  return match ? normalizeHref(match[1]) : '';
};

const parseTitle = (html: string) => {
  const match = html.match(/class=["'][^"']*\bpic_title\b[^"']*["'][^>]*>([\s\S]*?)</i);
  return match ? cleanText(match[1]) : '';
};

export const pageButtons = (currentPage: number, totalPages: number) => {
  if (totalPages <= 0) {
    return [1];
  }

  const buttons: Array<number | '...'> = [];
  const maxButtons = 9;
  const middleRange = 5;

  if (totalPages <= maxButtons) {
    return Array.from({length: totalPages}, (_item, index) => index + 1);
  }

  buttons.push(1);
  let startMiddle = Math.max(2, currentPage - Math.floor(middleRange / 2));
  let endMiddle = Math.min(totalPages - 1, startMiddle + middleRange - 1);

  if (endMiddle - startMiddle + 1 < middleRange) {
    startMiddle = Math.max(2, endMiddle - middleRange + 1);
  }
  if (startMiddle > 2) {
    buttons.push('...');
  }
  for (let index = startMiddle; index <= endMiddle; index += 1) {
    buttons.push(index);
  }
  if (endMiddle < totalPages - 1) {
    buttons.push('...');
  }
  buttons.push(totalPages);

  return buttons;
};
