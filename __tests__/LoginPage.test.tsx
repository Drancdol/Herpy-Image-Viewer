import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Pressable, TextInput} from 'react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {apiLogin, getLoginOutHref} from '../src/apis/auth';
import {LoginPage} from '../src/pages/LoginPage';
import type {MainPageData} from '../src/query/fetchers';
import {galleryQueryKey, mainPageQueryKey} from '../src/query/keys';
import {appReducer} from '../src/store/appSlice';
import {userReducer} from '../src/store/user';
import {THEMES} from '../src/tools/theme';

jest.mock('../src/apis/auth', () => ({
  apiLogin: jest.fn(),
  getLoginOutHref: jest.fn(),
}));

jest.mock('../src/component/AppHeader', () => ({
  AppHeader: () => null,
}));

jest.mock('../src/component/Toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

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
      },
    },
  });

beforeEach(() => {
  jest.clearAllMocks();
});

test('clears site queries after a successful login', async () => {
  const store = makeStore();
  const queryClient = makeQueryClient();
  const site = store.getState().app.site;
  const queryKey = mainPageQueryKey(site.baseUrl);
  const galleryKey = galleryQueryKey(site.baseUrl, 'favorites', 1);
  const otherSiteQueryKey = mainPageQueryKey('https://other.example');
  const otherSiteData: MainPageData = {
    categories: [],
    loginOutHref: '',
    userName: '',
  };
  const onSuccess = jest.fn();
  const apiLoginMock = apiLogin as jest.MockedFunction<typeof apiLogin>;
  const getLoginOutHrefMock = getLoginOutHref as jest.MockedFunction<
    typeof getLoginOutHref
  >;
  apiLoginMock.mockResolvedValue({
    statusCode: 200,
    data: '<html />',
    success: true,
    message: 'Login succeeded.',
  });
  getLoginOutHrefMock.mockReturnValue({
    href: 'logout.php?form_token=token',
    userName: 'alice',
  });
  queryClient.setQueryData<MainPageData>(queryKey, {
    categories: [],
    loginOutHref: '',
    userName: '',
  });
  queryClient.setQueryData(galleryKey, {
    images: [],
    pagination: {currentIndex: 1, totalPages: 1, totalNumber: 0},
  });
  queryClient.setQueryData<MainPageData>(otherSiteQueryKey, otherSiteData);

  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <LoginPage
            colors={THEMES.light}
            onBack={jest.fn()}
            onSuccess={onSuccess}
          />
        </Provider>
      </QueryClientProvider>,
    );
  });

  const inputs = renderer!.root.findAllByType(TextInput);
  ReactTestRenderer.act(() => {
    inputs[0].props.onChangeText('alice');
    inputs[1].props.onChangeText('password');
  });

  const [submitButton] = renderer!.root.findAllByType(Pressable);
  await ReactTestRenderer.act(async () => {
    await submitButton.props.onPress();
  });

  expect(apiLoginMock).toHaveBeenCalledWith(
    'alice',
    'password',
    site,
    `${site.baseUrl}/`,
  );
  expect(queryClient.getQueryData(queryKey)).toBeUndefined();
  expect(queryClient.getQueryData(galleryKey)).toBeUndefined();
  expect(queryClient.getQueryData(otherSiteQueryKey)).toEqual(otherSiteData);
  expect(store.getState().user).toMatchObject({
    loggedIn: true,
    loginOutHref: 'logout.php?form_token=token',
  });
  expect(onSuccess).toHaveBeenCalledTimes(1);

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
  queryClient.clear();
});

test('keeps existing queries after a failed login', async () => {
  const store = makeStore();
  const queryClient = makeQueryClient();
  const site = store.getState().app.site;
  const queryKey = mainPageQueryKey(site.baseUrl);
  const cachedData: MainPageData = {
    categories: [],
    loginOutHref: '',
    userName: '',
  };
  const onSuccess = jest.fn();
  const apiLoginMock = apiLogin as jest.MockedFunction<typeof apiLogin>;
  apiLoginMock.mockResolvedValue({
    statusCode: 200,
    data: '<html />',
    success: false,
    message: 'Invalid credentials.',
  });
  queryClient.setQueryData(queryKey, cachedData);
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <LoginPage
            colors={THEMES.light}
            onBack={jest.fn()}
            onSuccess={onSuccess}
          />
        </Provider>
      </QueryClientProvider>,
    );
  });

  const inputs = renderer!.root.findAllByType(TextInput);
  ReactTestRenderer.act(() => {
    inputs[0].props.onChangeText('alice');
    inputs[1].props.onChangeText('wrong-password');
  });

  const [submitButton] = renderer!.root.findAllByType(Pressable);
  await ReactTestRenderer.act(async () => {
    await submitButton.props.onPress();
  });

  expect(queryClient.getQueryData(queryKey)).toEqual(cachedData);
  expect(store.getState().user.loggedIn).toBe(false);
  expect(onSuccess).not.toHaveBeenCalled();

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
  queryClient.clear();
});
