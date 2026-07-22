import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {GalleryPage} from '../src/pages/GalleryPage';
import {appReducer} from '../src/store/appSlice';
import {userReducer} from '../src/store/user';
import {parseGalleryImages, parsePagination} from '../src/tools/process';
import {THEMES} from '../src/tools/theme';
import type {GalleryImage} from '../src/tools/types';

jest.mock('../src/component/AlbumGrid', () => {
  const mockReact = require('react');

  return {
    AlbumGrid: (props: unknown) => mockReact.createElement('AlbumGrid', props),
  };
});

jest.mock('../src/component/EmptyState', () => ({
  EmptyState: () => null,
}));

jest.mock('../src/component/LoadingState', () => ({
  LoadingState: () => null,
}));

jest.mock('../src/component/Pagination', () => ({
  Pagination: () => null,
}));

jest.mock('../src/tools/process', () => ({
  parseGalleryImages: jest.fn(),
  parsePagination: jest.fn(),
}));

const images: GalleryImage[] = [
  {
    href: '/image/1',
    album: '/thumbnail/1.jpg',
    name: 'Image 1',
    width: 100,
    height: 120,
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

const renderGalleryPage = (
  store: ReturnType<typeof makeStore>,
  queryClient: QueryClient,
  loadHtml: (page: number, signal?: AbortSignal) => Promise<string>,
) =>
  ReactTestRenderer.create(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <GalleryPage
          colors={THEMES.light}
          requestKey="album-1"
          loadHtml={loadHtml}
          onOpenImage={jest.fn()}
        />
      </Provider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
});

test('reuses a gallery page query after remounting', async () => {
  const parseGalleryImagesMock = parseGalleryImages as jest.MockedFunction<
    typeof parseGalleryImages
  >;
  const parsePaginationMock = parsePagination as jest.MockedFunction<
    typeof parsePagination
  >;
  parseGalleryImagesMock.mockReturnValue(images);
  parsePaginationMock.mockReturnValue({
    currentIndex: 1,
    totalPages: 1,
    totalNumber: 1,
  });
  const loadHtml = jest.fn(() => Promise.resolve('<html />'));
  const store = makeStore();
  const queryClient = makeQueryClient();
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = renderGalleryPage(store, queryClient, loadHtml);
  });
  await ReactTestRenderer.act(async () => {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 20);
    });
  });

  expect(loadHtml).toHaveBeenCalledTimes(1);
  expect(loadHtml).toHaveBeenCalledWith(1, expect.anything());
  expect(renderer!.root.findByProps({list: images}).props.list).toEqual(images);

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });

  await ReactTestRenderer.act(async () => {
    renderer = renderGalleryPage(store, queryClient, loadHtml);
  });

  expect(loadHtml).toHaveBeenCalledTimes(1);

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
  queryClient.clear();
});
