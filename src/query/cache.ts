import type {QueryClient} from '@tanstack/react-query';
import { siteQueryKey } from './keys';

const clearCache = async (queryClient: QueryClient, queryKey: readonly ['herpy', ...string[]]) => {
  await queryClient.cancelQueries({ queryKey });
  queryClient.removeQueries({ queryKey, type: 'inactive' });
  // A mounted screen retains its QueryObserver after removal, so reset active
  // queries to clear their result and start a fresh request for the new auth state.
  queryClient.resetQueries({ queryKey, type: 'active' }).catch(() => undefined);
};
export const clearSiteQueryCache = async (queryClient: QueryClient, siteBaseUrl: string) => {
  const queryKey = siteQueryKey(siteBaseUrl);
  await clearCache(queryClient, queryKey);
};
