import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Pressable} from 'react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {apiLogout} from '../src/apis/auth';
import {SettingPage} from '../src/pages/SettingPage';
import type {MainPageData} from '../src/query/fetchers';
import {mainPageQueryKey} from '../src/query/keys';
import {clearAuthorizationCookies} from '../src/storage/authorization';
import {appReducer} from '../src/store/appSlice';
import {userActions, userReducer} from '../src/store/user';
import {THEMES} from '../src/tools/theme';

jest.mock('../src/apis/auth', () => ({
  apiLogout: jest.fn(),
}));

jest.mock('../src/component/AppHeader', () => ({
  AppHeader: () => null,
}));

jest.mock('../src/component/SwitchRow', () => ({
  SwitchRow: () => null,
}));

jest.mock('../src/component/Toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('../src/storage/authorization', () => ({
  clearAuthorizationCookies: jest.fn(),
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

const renderSettingPage = (
  store: ReturnType<typeof makeStore>,
  queryClient: QueryClient,
) =>
  ReactTestRenderer.create(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <SettingPage
          colors={THEMES.light}
          onBack={jest.fn()}
          onLogin={jest.fn()}
        />
      </Provider>
    </QueryClientProvider>,
  );

const cachedData: MainPageData = {categories: [], loginOutHref: ''};

beforeEach(() => {
  jest.clearAllMocks();
});

test('clears auth state and site queries after a successful logout', async () => {
  const store = makeStore();
  const queryClient = makeQueryClient();
  const site = store.getState().app.site;
  const siteQueryKey = mainPageQueryKey(site.baseUrl);
  const otherSiteQueryKey = mainPageQueryKey('https://other.example');
  const logoutHref = 'logout.php?form_token=token';
  const apiLogoutMock = apiLogout as jest.MockedFunction<typeof apiLogout>;
  const clearCookiesMock = clearAuthorizationCookies as jest.MockedFunction<
    typeof clearAuthorizationCookies
  >;
  apiLogoutMock.mockResolvedValue({statusCode: 200, data: '', success: true});
  store.dispatch(userActions.setLoginState(logoutHref));
  queryClient.setQueryData(siteQueryKey, cachedData);
  queryClient.setQueryData(otherSiteQueryKey, cachedData);
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = renderSettingPage(store, queryClient);
  });

  const [authButton] = renderer!.root.findAllByType(Pressable);
  await ReactTestRenderer.act(async () => {
    await authButton.props.onPress();
  });

  expect(apiLogoutMock).toHaveBeenCalledWith(logoutHref, site);
  expect(clearCookiesMock).toHaveBeenCalledTimes(1);
  expect(queryClient.getQueryData(siteQueryKey)).toBeUndefined();
  expect(queryClient.getQueryData(otherSiteQueryKey)).toEqual(cachedData);
  expect(store.getState().user).toEqual({loggedIn: false, loginOutHref: ''});

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
  queryClient.clear();
});

test('keeps auth state and queries when logout fails', async () => {
  const store = makeStore();
  const queryClient = makeQueryClient();
  const site = store.getState().app.site;
  const siteQueryKey = mainPageQueryKey(site.baseUrl);
  const logoutHref = 'logout.php?form_token=token';
  const apiLogoutMock = apiLogout as jest.MockedFunction<typeof apiLogout>;
  const clearCookiesMock = clearAuthorizationCookies as jest.MockedFunction<
    typeof clearAuthorizationCookies
  >;
  apiLogoutMock.mockResolvedValue({statusCode: 200, data: '', success: false});
  store.dispatch(userActions.setLoginState(logoutHref));
  queryClient.setQueryData(siteQueryKey, cachedData);
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = renderSettingPage(store, queryClient);
  });

  const [authButton] = renderer!.root.findAllByType(Pressable);
  await ReactTestRenderer.act(async () => {
    await authButton.props.onPress();
  });

  expect(clearCookiesMock).not.toHaveBeenCalled();
  expect(queryClient.getQueryData(siteQueryKey)).toEqual(cachedData);
  expect(store.getState().user).toEqual({
    loggedIn: true,
    loginOutHref: logoutHref,
  });

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
  queryClient.clear();
});
