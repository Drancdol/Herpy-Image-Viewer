import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {ScrollView} from 'react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {apiMainPage} from '../src/apis/gallery';
import {IndexPage} from '../src/pages/IndexPage';
import {clearSiteQueryCache} from '../src/query/cache';
import type {MainPageData} from '../src/query/fetchers';
import {mainPageQueryKey} from '../src/query/keys';
import {appReducer} from '../src/store/appSlice';
import {userReducer} from '../src/store/user';
import {THEMES} from '../src/tools/theme';
import {parseMainPage} from '../src/tools/process';
import type {MainCategory} from '../src/tools/types';

jest.mock('../src/apis/auth', () => ({
  getLoginOutHref: jest.fn(() => ''),
}));

jest.mock('../src/apis/gallery', () => ({
  apiClassificationSwitchPage: jest.fn(),
  apiMainPage: jest.fn(),
}));

jest.mock('../src/component/AppHeader', () => ({
  AppHeader: () => null,
}));

jest.mock('../src/component/EmptyState', () => ({
  EmptyState: () => null,
}));

jest.mock('../src/pages/GalleryPage', () => ({
  GalleryPage: () => null,
}));

jest.mock('../src/component/LoadingState', () => ({
  LoadingState: () => null,
}));

jest.mock('../src/component/ThumbnailImage', () => ({
  ThumbnailImage: () => null,
}));

jest.mock('../src/tools/process', () => ({
  parseMainPage: jest.fn(),
}));

const categories: MainCategory[] = [
  {
    title: {href: '/category', name: 'Category'},
    content: [
      {
        href: '/album',
        album: '/cover.jpg',
        subTitle: 'Album',
        name: 'Description',
        desc: [],
      },
    ],
  },
];

const refreshedCategories: MainCategory[] = [
  {
    title: {href: '/refreshed-category', name: 'Refreshed category'},
    content: [],
  },
];

const makeStore = () =>
  configureStore({
    reducer: {
      app: appReducer,
      user: userReducer,
    },
  });

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retry: false,
        staleTime: Infinity,
      },
    },
  });

const renderIndexPage = (
  store: ReturnType<typeof makeStore>,
  queryClient: QueryClient,
) =>
  ReactTestRenderer.create(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <IndexPage
          colors={THEMES.light}
          onMenu={jest.fn()}
          onOpenImage={jest.fn()}
          onSearch={jest.fn()}
        />
      </Provider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
});

test('reuses cached home data until a manual refresh', async () => {
  const apiMainPageMock = apiMainPage as jest.MockedFunction<
    typeof apiMainPage
  >;
  const parseMainPageMock = parseMainPage as jest.MockedFunction<
    typeof parseMainPage
  >;
  apiMainPageMock.mockResolvedValue({statusCode: 200, data: '<html />'});
  parseMainPageMock
    .mockReturnValueOnce(categories)
    .mockReturnValueOnce(refreshedCategories);
  const store = makeStore();
  const queryClient = makeQueryClient();
  const queryKey = mainPageQueryKey(store.getState().app.site.baseUrl);
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = renderIndexPage(store, queryClient);
  });

  expect(apiMainPageMock).toHaveBeenCalledTimes(1);
  expect(
    queryClient.getQueryData<MainPageData>(queryKey)?.categories,
  ).toEqual(categories);

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });

  await ReactTestRenderer.act(async () => {
    renderer = renderIndexPage(store, queryClient);
  });

  expect(apiMainPageMock).toHaveBeenCalledTimes(1);

  const scrollView = renderer!.root.findByType(ScrollView);
  const refreshControl = scrollView.props.refreshControl as React.ReactElement<{
    onRefresh: () => Promise<unknown>;
  }>;

  await ReactTestRenderer.act(async () => {
    await refreshControl.props.onRefresh();
  });

  expect(apiMainPageMock).toHaveBeenCalledTimes(2);
  expect(
    queryClient.getQueryData<MainPageData>(queryKey)?.categories,
  ).toEqual(refreshedCategories);

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
  queryClient.clear();
});

test('requests the home page after its query cache is removed', async () => {
  const apiMainPageMock = apiMainPage as jest.MockedFunction<
    typeof apiMainPage
  >;
  const parseMainPageMock = parseMainPage as jest.MockedFunction<
    typeof parseMainPage
  >;
  apiMainPageMock.mockResolvedValue({statusCode: 200, data: '<html />'});
  parseMainPageMock.mockReturnValue(categories);
  const store = makeStore();
  const queryClient = makeQueryClient();
  const queryKey = mainPageQueryKey(store.getState().app.site.baseUrl);
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = renderIndexPage(store, queryClient);
  });
  expect(apiMainPageMock).toHaveBeenCalledTimes(1);

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
  queryClient.removeQueries({queryKey});
  expect(queryClient.getQueryData(queryKey)).toBeUndefined();

  await ReactTestRenderer.act(async () => {
    renderer = renderIndexPage(store, queryClient);
  });
  expect(apiMainPageMock).toHaveBeenCalledTimes(2);

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
  queryClient.clear();
});

test('refreshes an active home query when site cache is cleared', async () => {
  const apiMainPageMock = apiMainPage as jest.MockedFunction<
    typeof apiMainPage
  >;
  const parseMainPageMock = parseMainPage as jest.MockedFunction<
    typeof parseMainPage
  >;
  apiMainPageMock.mockResolvedValue({statusCode: 200, data: '<html />'});
  parseMainPageMock.mockReturnValue(categories);
  const store = makeStore();
  const queryClient = makeQueryClient();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = renderIndexPage(store, queryClient);
  });
  expect(apiMainPageMock).toHaveBeenCalledTimes(1);

  await ReactTestRenderer.act(async () => {
    await clearSiteQueryCache(queryClient, store.getState().app.site.baseUrl);
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 0);
    });
  });

  expect(apiMainPageMock).toHaveBeenCalledTimes(2);

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
  queryClient.clear();
});
