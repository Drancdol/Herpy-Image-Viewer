export const siteQueryKey = (siteBaseUrl: string) =>
  ['herpy', siteBaseUrl] as const;

export const mainPageQueryKey = (siteBaseUrl: string) =>
  [...siteQueryKey(siteBaseUrl), 'main-page'] as const;

export const galleryQueryKey = (
  siteBaseUrl: string,
  requestKey: string,
  page: number,
) => [...siteQueryKey(siteBaseUrl), 'gallery', requestKey, page] as const;

export const galleryQueryPrefix = (
  siteBaseUrl: string,
  requestKey: string,
) => [...siteQueryKey(siteBaseUrl), 'gallery', requestKey] as const;

export const imageDetailQueryKey = (siteBaseUrl: string, href: string) =>
  [...siteQueryKey(siteBaseUrl), 'image-detail', href] as const;

export const rawImageQueryKey = (siteBaseUrl: string, href: string) =>
  [...siteQueryKey(siteBaseUrl), 'raw-image', href] as const;
